var express = require('express');
var router = express.Router();
var uuid = require('uuid');
const con = require('../utils/index').con;
var sql = require('../utils/SQLCommand');
const sqlController = require('../controllers/SQLController');
var dateFunction = require('../utils/date');
const connect = require('../utils/index').connect;
let objSort = require('../utils/index').objSort;


/* 首頁 */
router.get('/', function(req, res, next) {
    res.send("有啦")
});


//登入系統：註冊
router.get('/register/:androidId',  function(req, res, next) {
    let androidId = req.params.androidId;
    //用uuid產生userId
    var userId = uuid.v1();

    //新增至TABLE 「user」並「回傳userId」
    // let insert = "INSERT INTO mood_cabin.user VALUES ( '" + userId + "', '" + imei + "');"
    let insert = sql.insertInto('mood_cabin.user')
                    .values(userId, androidId)
                    .gen();
    con.query(insert, async function(err, result){
        let moodAndEvent;
        //已註冊用戶
        if (err){
            // let getUserId = "SELECT user_id FROM mood_cabin.user where imei = "+ imei + ";";
            let getUserId = sql.select('user_id')
                               .from('mood_cabin.user')
                               .where("android_id = '" + androidId + "'")
                               .gen();
            con.query(getUserId, async function(err,result){
                userId = result[0].user_id;
                moodAndEvent = await sqlController.getMoodAndEvent(userId);
                res.json({msg: "Registered user!",
                        userId,
                        moodAndEvent});
            })
        }

        //新用戶
        else{
            //用戶初次設定心情
            let insertMood = "insert into mood_cabin.mood (user_id, mood_name, icon)" +
            "values('" + userId + "', '高興', 1)," +
            "('" + userId + "', '厭煩', 2)," +
            "('" + userId + "', '平靜', 3)," +
            "('" + userId + "', '焦慮', 4);";
            con.query(insertMood, function(err, result2){
                if (err) throw err;
            })
            //用戶初次設定活動種類
            let insertEventType = "insert into mood_cabin.event_type (user_id, event_type_name)" +
            "values('" + userId + "', '社交')," +
            "('" + userId + "', '健康')," +
            "('" + userId + "', '休閒')," +
            
            "('" + userId + "', '天氣');";
            con.query(insertEventType, function(err, result3){
                if (err) throw err;
            })

            //用戶初次設定活動內容：社交
            let eventTypeSetting = ['社交', '健康', '休閒', '天氣'];
            let eventSetting = [['朋友', '家庭', '約會'], ['水果', '運動', '喝水'], ['遊戲', '閱讀', '影片'], ['晴天', '多雲', '雨天']];
            
            for (let i = 0; i < eventTypeSetting.length; i++){
                //找出活動類型主鍵
                let getPrimaryOfEventType = "SELECT event_type_id FROM mood_cabin.event_type " +
                "where user_id = '"+ userId +"'" +
                "and event_type_name = '" + eventTypeSetting[i] + "' " +
                "limit 1;";
                con.query(getPrimaryOfEventType, function(err,result){
                    if(err) throw err;
                    let PrimayOfEventType = result[0].event_type_id;
                    for (let j = 0; j < eventSetting[i].length; j++){
                        //新增活動內容
                        let insertEvent = "insert into mood_cabin.event (user_id, event_type_id, event_name, icon)" + 
                        "values('"+ userId + "'," + PrimayOfEventType + ", '"+ eventSetting[i][j]+"', " + (100 + i * 3 + j) + ");";
                        con.query(insertEvent, function(err,result){
                            if(err) throw err;
                        })
                    }
                })
            }

            moodAndEvent = await sqlController.getMoodAndEvent(userId);
            res.json({msg: "Registration success!",
                    userId,
                    moodAndEvent});
        }
    });
    
});

//登入系統：登入
router.get('/login/:userId', function(req, res, next) {
    let userId = req.params.userId;

    //驗證用戶存不存在
    let selectUserId = "SELECT 1 from mood_cabin.user where user_id = '" + userId + "' limit 1;"
    con.query(selectUserId, function(err, result){
        if (err) throw err;
        
        if (result.length > 0){
            res.json({msg: "Valid UserId."});
        }
        else{
            res.json({msg: "No such user."});
        }
    });

});

//main：主頁顯示全部日記
router.get('/main/getAllDiary/:userId', async function(req, res, next){
    let userId = req.params.userId;
    //預期輸出樣式
    var output = {
        diary:[]
    };
    let singleDiary = {
        "diaryId":"",
        "recordDate": "",
        "mood":{},
        "event":[],
        "content":""
    };


    //取得全日記，刪除的部分待處理
    let getDiaryCommand = sql.select('diary_id, record_date, content')
                             .from('mood_cabin.diary')
                             .where("user_id = '" + userId + "'")
                             .and('is_deleted IS NULL')
                             .orderBy('record_date', 'ASC')
                             .gen();

                             
    let diaryResult = await connect(getDiaryCommand);

    //存下diary日期與內容
    for (let i in diaryResult){
        //預期輸出格式
        singleDiary = {
            "diaryId":"",
            "day":"",
            "recordDate": "",
            "mood":{},
            "event":[],
            "content":""
        };
        singleDiary.diaryId = diaryResult[i].diary_id;
        singleDiary.day = (new Date(diaryResult[i].record_date)).getDay();
        if (singleDiary.day == 0){
            singleDiary.day = 7;
        }
        singleDiary.recordDate = dateFunction.transform(diaryResult[i].record_date);
        singleDiary.content = diaryResult[i].content;
        //找當天心情
        let getMoodCommand = sql.select('M.mood_name, DM.score')
                                .from('mood_cabin.diary_mood DM')
                                .innerJoin('mood_cabin.mood M')
                                .on('DM.mood_id = M.mood_id')
                                .where('DM.diary_id = ' + diaryResult[i].diary_id)
                                .and('DM.score > 0')
                                .orderBy('M.mood_id', 'ASC')
                                .gen();
        let moodResult = await connect(getMoodCommand);
        for (let j in moodResult){
            singleDiary.mood[moodResult[j].mood_name] = moodResult[j].score;
        }
        //讓心情按大小排序
        singleDiary.mood = objSort(singleDiary.mood);


        //找當天活動內容
        let getEventTypeCommand = sql.select('E.event_name')
                                     .from('mood_cabin.diary_event DE')
                                     .innerJoin('mood_cabin.event E')
                                     .on('DE.event_id = E.event_id')
                                     .where('DE.diary_id = ' + diaryResult[i].diary_id)
                                     .and('DE.is_done = 1')
                                     .orderBy('E.event_id', 'ASC')
                                     .gen();
        
        let eventResult = await connect(getEventTypeCommand);
        for (let j in eventResult){
            singleDiary.event.push(eventResult[j].event_name);
        }
        
        output.diary.push(singleDiary);
    }
    res.json(output);
    
})


//main：新增日記 body要有 record_date, mood, event, content, userId
router.post('/main/addDiary/:userId', async function (req, res, next){
    //接下顯示資料
    let record_date = req.body.record_date;
    let mood = req.body.mood;
    let event = req.body.event;
    let content = req.body.content;
    let userId = req.params.userId;

    //確認是第幾篇日記，計算record_order
    const startDate = dateFunction.startofDate(record_date);
    const endDate = dateFunction.endofDate(record_date);
    const getThatDayDiaryCountCommand = sql.select('record_order')
                                         .from('mood_cabin.diary')
                                         .where('record_date')
                                         .between(startDate, endDate)
                                         .and("user_id = '" + userId + "'")
                                         .gen();
    const record_order = (await connect(getThatDayDiaryCountCommand)).length + 1;

    //新增diary
    const addDiaryCommand = sql.insertInto('mood_cabin.diary', 'user_id', 'record_date', 'record_order', 'content')
                                .values(userId, record_date, record_order,content)
                                .gen();
    await connect(addDiaryCommand);
        //找回剛新增diary的id
    const getDiaryIdCommand = sql.select('diary_id')
                                 .from('mood_cabin.diary')
                                 .where("user_id = '" + userId + "'")
                                 .and("record_date = '" + record_date + "'")
                                 .and('record_order= ' + record_order)
                                 .gen();
    const diaryId = (await connect(getDiaryIdCommand))[0].diary_id;

    //新增diary_mood
    let moodObj = await sqlController.moodObj(userId);
    for (let i = 0; i < mood.length; i++){
        const addDiaryMoodCommand = sql.insertInto('mood_cabin.diary_mood', 'diary_id', 'mood_id', 'score')
                                       .values(diaryId, Object.values(moodObj)[i], mood[i])
                                       .gen();
        await connect(addDiaryMoodCommand);
    }

    //新增diary_event
    let eventTypeObj = await sqlController.eventTypeObj(userId); 
    let eventObj = await sqlController.eventObj(userId);
    
    const getEventTypeCommand = sql.select('event_type_id')
                                   .from('mood_cabin.event_type')
                                   .where("user_id = '" + userId + "'")
                                   .orderBy('event_type_id', 'ASC')
                                   .gen();
    const resultEventType = await connect(getEventTypeCommand);


    console.log("bug mode");
    for (let i = 0; i < event.length; i++){
        console.log(event[i]);
    }

    
    for (let i = 0; i < event.length; i++){
        const getEventCommand = sql.select('event_id')
                                   .from('mood_cabin.event')
                                   .where('event_type_id = ' + resultEventType[i].event_type_id)
                                   .orderBy('event_id', 'ASC')
                                   .gen();
        const resultEvent = await connect(getEventCommand);
        for (let j = 0; j < resultEvent.length; j++){
            const addDiaryEventCommand = sql.insertInto('mood_cabin.diary_event', 'diary_id', 'event_type_id', 'event_id', 'is_done')
                                            .values(diaryId, resultEventType[i].event_type_id, resultEvent[j].event_id, event[i][j])
                                            .gen();
            await connect(addDiaryEventCommand);
        }

    }

    res.json({msg:'success'});
})


module.exports = router;
