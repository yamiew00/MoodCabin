var express = require('express');
var router = express.Router();
let con = require('../utils/index').con;
var sql = require('../utils/SQLCommand');
const sqlController = require('../controllers/SQLController');
const connect = require('../utils/index').connect;
const randomGen = require('../utils/randomGen');
const dateFunction = require('../utils/date');

//user
router.get('/getUser', function(req, res, next) {

    let getAll = sql.select('*')
                    .from('mood_cabin.user')
                    .gen();
    con.query(getAll,function(err, result){
        if (err) throw err;
        let output = {};
        for (let i in result){
            output[result[i].user_id] = result[i].android_id;
        }
        res.json(output);
    })
});

//得到user全資料
router.get('/getMoodAndEvent/:userId', async function(req, res, next){
    let userId = req.params.userId;
    let output = await sqlController.getMoodAndEvent(userId);
    res.json(output);
});

//刪除用戶「全資料」
router.post('/deleteAll/:userId', async function(req, res, next){
    const userId = req.params.userId;

    //1.找出全diary_id
    const getDiaryCommand = sql.select('diary_id')
                               .from('mood_cabin.diary')
                               .where("user_id = '" + userId + "'")
                               .gen();
    const diaryIdArr = await connect(getDiaryCommand);


    //若有聊天室則刪聊天室
    const getChatroomIdCommand = sql.select('C.chatroom_id')
                                    .from('mood_cabin.chatroom C')
                                    .innerJoin('mood_cabin.diary D')
                                    .on('C.diary_id = D.diary_id')
                                    .where("C.guest_id = '" + userId + "'")
                                    .or("D.user_id = '" + userId + "'")
                                    .gen();
    const resultChatroomId = await connect(getChatroomIdCommand);
    console.log(getChatroomIdCommand);
        //刪除聊天室內訊息及聊天室
    for (let i of resultChatroomId){
        console.log(i.chatroom_id);
        const deleteMessageCommand = sql.deleteFrom('mood_cabin.message')
                                        .where('chatroom_id = ' + i.chatroom_id)
                                        .gen();
        const deleteChatroomCommand = sql.deleteFrom('mood_cabin.chatroom')
                                         .where('chatroom_id = ' + i.chatroom_id)
                                         .gen();
        await connect(deleteMessageCommand);
        await connect(deleteChatroomCommand);
    }
        
    
    //若有寫日記則刪日記
    if (diaryIdArr.length > 0){
        let  orCondition = "( diary_id = " + diaryIdArr[0].diary_id + " ";
        for (let i = 1; i < diaryIdArr.length; i++){
            orCondition += sql.or(" diary_id = " + diaryIdArr[i].diary_id + " ")
                            .gen();
        }
        orCondition += ") ";

        //若廣場有貼文要先刪
        const deletePostCommand = sql.deleteFrom('mood_cabin.square')
                                     .where(orCondition)
                                     .gen();
        await connect(deletePostCommand);
        //刪除全diary_event
        const deleteDiaryEventCommand = sql.deleteFrom('mood_cabin.diary_event')
                                        .where(orCondition)
                                        .gen();
        await connect(deleteDiaryEventCommand);
        //刪除全diary_mood
        const deleteDiaryMoodCommand = sql.deleteFrom('mood_cabin.diary_mood')
                                        .where(orCondition)
                                        .gen();
        await connect(deleteDiaryMoodCommand);
        //刪除全diary
        const deleteDiaryCommand = sql.deleteFrom('mood_cabin.diary')
                                      .where("user_id = '" + userId + "'")
                                      .gen();
        await connect(deleteDiaryCommand);
    }

    //刪event
    const deleteEventCommand = sql.deleteFrom('mood_cabin.event')
                                  .where("user_id = '" + userId + "'")
                                  .gen();
    await connect(deleteEventCommand);
    //刪event_type
    const deleteTypeCommand = sql.deleteFrom('mood_cabin.event_type')
                                 .where("user_id = '" + userId + "'")
                                 .gen();
    await connect(deleteTypeCommand);
    //刪mood
    const deleteMoodCommand = sql.deleteFrom('mood_cabin.mood')
                                 .where("user_id = '" + userId + "'")
                                 .gen();
    await connect(deleteMoodCommand);


    //刪notification
    const deleteNotificationCommand = sql.deleteFrom('mood_cabin.notification')
                                         .where("target_user_id = '" + userId + "'")
                                         .or("from_user_id = '" + userId + "'")
                                         .gen();
    await connect(deleteNotificationCommand);


    //刪user
    const deleteUserCommand = sql.deleteFrom('mood_cabin.user')
                                 .where("user_id = '" + userId + "'")
                                 .gen();
    await connect(deleteUserCommand);

    res.json({msg: "用戶「" +userId + "」的資料已完全清空"})
})

//在指定月分新增n筆資料。query要有userId、month、setMood、setEvent、count。month範例='2020-12'
router.post('/addRandomData', async function(req, res, next){
    const userId = req.body.userId;
    const month = req.body.month;
    const setMood = req.body.setMood;
    /*{
        "新心情": 2,
        "新心情": 3,
    }
    */
    const setEvent = req.body.setEvent;
        /*{
        "(新or舊種類)": {
            "新活動" : 38
        },
        "(新or舊種類)": {
            "別的活動": 41,
            "別的活動2": 44,
        },
    }
    */
    const count = req.body.count;


    //預先載入活動種類的配對
    let eventTypeObj = await sqlController.eventTypeObj(userId);
    
    //加上新心情
    for (let i in setMood){
        //加入一個新心情
        let addMoodCommand = sql.insertInto('mood_cabin.mood(user_id, mood_name, icon)')
                                .values(userId, i, setMood[i])
                                .gen();
        await connect(addMoodCommand);
        
        //取得剛加入的心情的id
        let newMoodId = (await sqlController.moodObj(userId))[i];
        
        //找到用戶曾寫過的所有日記
        let getDiaryIdCommand = sql.select('diary_id')
                                .from('mood_cabin.diary')
                                .where("user_id = '" + userId + "'")
                                .gen();
        let resultDiaryId = await connect(getDiaryIdCommand);
        
        //在所有日記中新增新心情並設score為0
        for (let i in resultDiaryId){
            let addMoodDiary = sql.insertInto('mood_cabin.diary_mood (diary_id, mood_id, score)')
                                .values(resultDiaryId[i].diary_id, newMoodId, 0)
                                .gen();
            await connect(addMoodDiary);
        }
    }

    //設定新活動
    for (let i in setEvent){
        //若是新的活動種類則要先新增並拿到id
        if (!Object.keys(eventTypeObj).includes(i)){
            let addTypeCommand = sql.insertInto('mood_cabin.event_type(user_id, event_type_name)')
                                    .values(userId, i)
                                    .gen();
            await connect(addTypeCommand);
            eventTypeObj = await sqlController.eventTypeObj(userId);
        }
        //新增活動
        for (let j in setEvent[i]){    
            //新增單個活動    
            let addEventCommand = sql.insertInto('mood_cabin.event(user_id, event_type_id, event_name, icon)')
                                    .values(userId, eventTypeObj[i], j, setEvent[i][j])
                                    .gen();
            await connect(addEventCommand);
            
            //找回剛剛活動的id
                let getNewEventId = sql.select('event_id')
                                       .from('mood_cabin.event')
                                       .where("user_id = '" + userId + "'")
                                       .and("event_name = '" + j + "'")
                                       .gen();
            let newEventId = (await connect(getNewEventId))[0].event_id ;

            //找到用戶曾寫過的所有日記
            let getDiaryIdCommand = sql.select('diary_id')
                                       .from('mood_cabin.diary')
                                       .where("user_id = '" + userId + "'")
                                       .gen();
            let resultDiaryId = await connect(getDiaryIdCommand);

            //在所有日記中新增新活動並把is_done都設為0
            for (let k in resultDiaryId){
                let addEventDiary = sql.insertInto('mood_cabin.diary_event(diary_id, event_type_id, event_id, is_done)')
                                    .values(resultDiaryId[k].diary_id, eventTypeObj[i], newEventId, 0)
                                    .gen();
                await connect(addEventDiary);
            }
        }
    }

    //新增count篇的日記
    for (let i = 0; i < count; i++){
        //隨機產生記錄日期
        const record_date = randomGen.day(month);
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

        //新增diary，此模式下content預設為空
            const addDiaryCommand = sql.insertInto('mood_cabin.diary', 'user_id', 'record_date', 'record_order', 'content')
                                       .values(userId, record_date, record_order,"")
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
        const moodObj = await sqlController.moodObj(userId);
        for (let j in moodObj){
            //若隨機出來為0則當日不計分
                const addDiaryMoodCommand = sql.insertInto('mood_cabin.diary_mood', 'diary_id', 'mood_id', 'score')
                                            .values(diaryId, moodObj[j], randomGen.random(0,5))
                                            .gen();
                await connect(addDiaryMoodCommand);
        }

        //新增diary_event
        eventTypeObj = await sqlController.eventTypeObj(userId); 
        const eventObj = await sqlController.eventObj(userId);
        for (let j in eventTypeObj){
            //求該活動種類下的活動id
            const getEventIdCommand = sql.select('event_id')
                                            .from('mood_cabin.event')
                                            .where('event_type_id = ' + eventTypeObj[j])
                                            .gen();
            const currentEventId = await connect(getEventIdCommand);
            //新增日記
            for (let k in currentEventId){
                const addDiaryEventCommand = sql.insertInto('mood_cabin.diary_event', 'diary_id', 'event_type_id', 'event_id', 'is_done')
                                                .values(diaryId, eventTypeObj[j], currentEventId[k].event_id, randomGen.random(0,1))
                                                .gen();
                await connect(addDiaryEventCommand);
            }
        }
    }

    res.json({msg: count + "篇日記已被隨機生成"});
})
module.exports = router;
