var express = require('express');
var router = express.Router();
var sql = require('../utils/SQLCommand');
const sqlController = require('../controllers/SQLController');
const connect = require('../utils/index').connect;
var dateFunction = require('../utils/date');

//1.心情部分
//body要有userId, moodName, icon
router.post('/mood/add', async function(req, res, next){
    //傳輸資料
    let userId = req.body.userId;
    let moodName = req.body.moodName;
    let icon = req.body.iconPath;

    //加入新心情
    let addMoodCommand = sql.insertInto('mood_cabin.mood(user_id, mood_name, icon)')
                            .values(userId, moodName, icon)
                            .gen();
    await connect(addMoodCommand);

    //取得剛加入的心情的id
    let newMoodId = (await sqlController.moodObj(userId))[moodName];
    
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
    res.json(await sqlController.getMoodAndEvent(userId));
})
//body要有userId, oldMoodName, newMoodName, icon
router.post('/mood/update', async function(req, res, next){
    //傳輸資料
    let userId = req.body.userId;
    let oldMoodName = req.body.oldMoodName;
    let newMoodName  = req.body.newMoodName ;
    let icon = req.body.iconPath;

    let moodId = (await sqlController.moodObj(userId))[oldMoodName];
    let updateMoodCommand = sql.update('mood_cabin.mood')
                                .set("mood_name = '" + newMoodName + "'")
                                .where('mood_id = ' + moodId)
                                .gen();
    let updateIconCommand = sql.update('mood_cabin.mood')
                                .set('icon = ' + icon)
                                .where('mood_id = ' + moodId)
                                .gen();
    await connect(updateMoodCommand);
    await connect(updateIconCommand);

    res.json(await sqlController.getMoodAndEvent(userId));
})
//body要有userId, moodName
router.post('/mood/delete', async function(req, res, next){
    //傳輸資料
    let userId = req.body.userId;
    let moodName = req.body.moodName;

    let moodId = (await sqlController.moodObj(userId))[moodName];
    //要先刪除日記裡關於該心情的全部資料
    let deleteDiaryMoodCommand = sql.deleteFrom('mood_cabin.diary_mood')
                                    .where('mood_id = ' + moodId)
                                    .gen();
    await connect(deleteDiaryMoodCommand);
    
    //刪除該用戶的心情資料
    let deleteMoodCommand = sql.deleteFrom('mood_cabin.mood')
                               .where('mood_id = ' + moodId)
                               .gen();
    await connect(deleteMoodCommand);

    res.json(await sqlController.getMoodAndEvent(userId));
})

//2.活動種類部分
//body要有userId, eventTypeName
router.post('/eventType/add', async function(req, res, next){
    let userId = req.body.userId;
    let eventTypeName = req.body.eventTypeName;

    let addTypeCommand = sql.insertInto('mood_cabin.event_type(user_id, event_type_name)')
                            .values(userId, eventTypeName)
                            .gen();
    await connect(addTypeCommand);

    res.json(await sqlController.getMoodAndEvent(userId));
})
//body要有userId, oldEventTypeName, newEventTypeName 
router.post('/eventType/update', async function(req, res, next){
    let userId = req.body.userId;
    let oldEventTypeName = req.body.oldEventTypeName;
    let newEventTypeName = req.body.newEventTypeName;

    //先取得type的id
    let getTypeIdCommand = sql.select('event_type_id')
                              .from('mood_cabin.event_type')
                              .where("user_id = '" + userId + "'")
                              .and("event_type_name = '" + oldEventTypeName + "'")
                              .gen();
    let eventTypeId = (await connect(getTypeIdCommand))[0].event_type_id;
    
    //改名
    let updateTypeCommand = sql.update('mood_cabin.event_type')
                               .set("event_type_name = '" + newEventTypeName + "'")
                               .where('event_type_id = ' + eventTypeId)
                               .gen();
    await connect(updateTypeCommand);

    res.json(await sqlController.getMoodAndEvent(userId));
})
//body要有userId, eventTypeName  (只能刪空的資料夾)
router.post('/eventType/delete', async function(req, res, next){
    let userId = req.body.userId;
    let eventTypeName  = req.body.eventTypeName;

    //先取得type的id
    let getTypeIdCommand = sql.select('event_type_id')
                              .from('mood_cabin.event_type')
                              .where("user_id = '" + userId + "'")
                              .and("event_type_name = '" + eventTypeName + "'")
                              .gen();
    let eventTypeId = (await connect(getTypeIdCommand))[0].event_type_id;

    //刪除該種類下所有活動的日記本
    let deleteDiaryEventCommand = sql.deleteFrom('mood_cabin.diary_event')
                                     .where('event_type_id = ' + eventTypeId)
                                     .gen();
    await connect(deleteDiaryEventCommand);

    //刪除該種類下所有活動
    let deleteEventCommand = sql.deleteFrom('mood_cabin.event')
                                .where('event_type_id = ' + eventTypeId)
                                .gen();
    await connect(deleteEventCommand);

    //刪除eventType
    let deleteTypeCommand = sql.deleteFrom('mood_cabin.event_type')
                               .where('event_type_id = ' + eventTypeId)
                               .gen();
    await connect(deleteTypeCommand);

    res.json(await sqlController.getMoodAndEvent(userId));
})

//3.活動部分
//body要有userId,eventTypeName, eventName, iconPath
router.post('/event/add', async function(req, res, next){
    let userId = req.body.userId;
    let eventTypeName = req.body.eventTypeName;
    let eventName = req.body.eventName;
    let iconPath = req.body.iconPath;

    //先取得type的id
    let getTypeIdCommand = sql.select('event_type_id')
                              .from('mood_cabin.event_type')
                              .where("user_id = '" + userId + "'")
                              .and("event_type_name = '" + eventTypeName + "'")
                              .gen();
    let eventTypeId = (await connect(getTypeIdCommand))[0].event_type_id;

    //新增活動
    let addEventCommand = sql.insertInto('mood_cabin.event(user_id, event_type_id, event_name, icon)')
                             .values(userId, eventTypeId, eventName, iconPath)
                             .gen();
    await connect(addEventCommand);
    //找回剛剛活動的id
    let getNewEventId = sql.select('event_id')
                           .from('mood_cabin.event')
                           .where("user_id = '" + userId + "'")
                           .and("event_name = '" + eventName + "'")
                           .gen();
    let newEventId = (await connect(getNewEventId))[0].event_id ;

    
    //找到用戶曾寫過的所有日記
    let getDiaryIdCommand = sql.select('diary_id')
                               .from('mood_cabin.diary')
                               .where("user_id = '" + userId + "'")
                               .gen();
    let resultDiaryId = await connect(getDiaryIdCommand);

    //在所有日記中新增新活動並把is_done都設為0
    for (let i in resultDiaryId){
        let addEventDiary = sql.insertInto('mood_cabin.diary_event(diary_id, event_type_id, event_id, is_done)')
                               .values(resultDiaryId[i].diary_id, eventTypeId, newEventId, 0)
                               .gen();
        await connect(addEventDiary);
    }

    res.json(await sqlController.getMoodAndEvent(userId));
})

//body要有userId, oldEventName, newEventName, iconPath 
router.post('/event/update', async function(req, res, next){
    let userId = req.body.userId;
    let oldEventName = req.body.oldEventName;
    let newEventName = req.body.newEventName;
    let icon = req.body.iconPath;

    //拿到eventId
    let eventId = (await sqlController.eventObj(userId))[oldEventName];

    //更新
    let updateEventCommand = sql.update('mood_cabin.event')
                                .set("event_name = '" + newEventName + "'")
                                .where('event_id = ' + eventId)
                                .gen();
    let updateIconCommand = sql.update('mood_cabin.event')
                                .set('icon = ' + icon)
                                .where('event_id = ' + eventId)
                                .gen();
    await connect(updateEventCommand);
    await connect(updateIconCommand);

    res.json(await sqlController.getMoodAndEvent(userId));
})
//body要有userId,eventName , eventTypeName , iconPath
router.post('/event/update2', async function(req, res, next){
    const userId = req.body.userId;
    const eventName = req.body.eventName;
    const eventTypeName = req.body.eventTypeName;
    const icon = req.body.iconPath;  

    //拿到eventTypeId、eventId
    const eventTypeId = (await sqlController.eventTypeObj(userId))[eventTypeName];
    const eventId = (await sqlController.eventObj(userId))[eventName];

    //更新event的eventType
    const updateTypeCommand = sql.update('mood_cabin.event')
                                 .set('event_type_id = ' + eventTypeId)
                                 .where('event_id = ' + eventId)
                                 .gen();
    await connect(updateTypeCommand);

    //更新diary_event中的eventType
    const updateDiaryEventCommand = sql.update('mood_cabin.diary_event')
                                       .set('event_type_id = ' + eventTypeId)
                                       .where('event_id = ' + eventId)
                                       .gen();
    await connect(updateDiaryEventCommand);

    //更新event的icon
    let updateIconCommand = sql.update('mood_cabin.event')
                               .set('icon = ' + icon)
                               .where('event_id = ' + eventId)
                               .gen();
    await connect(updateIconCommand);

    res.json(await sqlController.getMoodAndEvent(userId));
})

//body要有userId, eventName
router.post('/event/delete', async function(req, res, next){
    let userId = req.body.userId;
    let eventName = req.body.eventName;
    
    //拿到eventId
    let eventId = (await sqlController.eventObj(userId))[eventName];

    //要先刪除日記裡關於該心情的全部資料
    let deleteDiaryEventCommand = sql.deleteFrom('mood_cabin.diary_event')
                                .where('event_id = ' + eventId)
                                .gen();
    await connect(deleteDiaryEventCommand);

    //刪除event
    let deleteEventCommand = sql.deleteFrom('mood_cabin.event')
                                .where('event_id = ' + eventId)
                                .gen();                
    await connect(deleteEventCommand);

    res.json(await sqlController.getMoodAndEvent(userId));
})


//4.日記部分
//body要有diaryId, recordDate, mood, event, content
router.post('/diary/update', async function(req, res, next){
    let diaryId = req.body.diaryId;
    let recordDate = req.body.recordDate;
    let mood = req.body.mood;
    let event = req.body.event;
    let content = req.body.content;

    //拿userId
    let getUserIdCommand = sql.select('user_id')
                              .from('mood_cabin.diary')
                              .where('diary_id = ' + diaryId)
                              .gen();
    let userId = (await connect(getUserIdCommand))[0].user_id;


    //用戶擁有的心情與活動
    let moodObj = await sqlController.moodObj(userId);
    let eventObj = await sqlController.eventObj(userId);
    let eventTypeObj = await sqlController.eventTypeObj(userId);

    //更新日記本(1)
    let updateDiaryContentCommand = sql.update('mood_cabin.diary')
                                        .set("content = '" + content + "'")
                                        .where('diary_id = ' + diaryId)
                                        .gen();
    let updateDiaryRecordOrderCommand = sql.update('mood_cabin.diary')
                                           .set("record_date = '" + recordDate + "'")
                                           .where('diary_id = ' + diaryId)
                                           .gen();
    await connect(updateDiaryContentCommand);
    await connect(updateDiaryRecordOrderCommand);

    //更新心情日記本
    for (let i = 0; i < mood.length; i++){
        let updateDiaryMoodCommand = sql.update('mood_cabin.diary_mood')
                                        .set('score = ' + mood[i])
                                        .where('mood_id = ' + Object.values(moodObj)[i])
                                        .and('diary_id =' + diaryId)
                                        .gen();
        await connect(updateDiaryMoodCommand);
    }

    //更新活動日記本
    let tmp = 0; //用來計算eventObj的圈數
    for (let i = 0; i < event.length; i++){
        for (let j = 0; j < event[i].length; j++){
            let updateDiaryEventCommand = sql.update('mood_cabin.diary_event')
                                             .set('is_done = ' + event[i][j])
                                             .where('diary_id = ' + diaryId)
                                             .and('event_type_id = ' + Object.values(eventTypeObj)[i])
                                             .and('event_id = ' + Object.values(eventObj)[tmp++])
                                             .gen();
            await connect(updateDiaryEventCommand);
        }
    }
    res.json({"msg" : "success"})
    
})
//body要有diaryId
router.get('/diary/:diaryId', async function(req, res, next){
    const diaryId = req.params.diaryId;
    res.json(await sqlController.getDiaryById(diaryId));
})
//body要有diaryId
router.post('/diary/delete', async function(req, res, next){
    let diaryId = req.body.diaryId;

    //檢查對應日記是否有聊天室
    const checkChatroomCommand = sql.select('count(diary_id) count')
                                    .from('mood_cabin.chatroom')
                                    .where('diary_id = ' + diaryId)
                                    .gen();
    const resultCheckChatroom = (await connect(checkChatroomCommand))[0].count;
    if(resultCheckChatroom > 0){
        //活動歸零
        const eventSetZeroCommand = sql.update('mood_cabin.diary_event')
                                       .set('is_done = 0')
                                       .where('diary_id = ' + diaryId)
                                       .gen();
        await connect(eventSetZeroCommand);

        //心情歸零
        const moodSetZeroCommand = sql.update('mood_cabin.diary_mood')
                                      .set('score = 0')
                                      .where('diary_id = ' + diaryId)
                                      .gen();
        await connect(moodSetZeroCommand);

        //日記假刪除
        const diarySetZeroCommand = sql.update('mood_cabin.diary')
                                       .set('is_deleted = 1')
                                       .where('diary_id = ' + diaryId)
                                       .gen();
        await connect(diarySetZeroCommand);

            //刪廣場貼文
        const deletePostCommand = sql.deleteFrom('mood_cabin.square')
                                     .where('diary_id =' + diaryId)
                                     .gen();
        await connect(deletePostCommand);


        res.json({"msg" : "success"});
        return;
    }

    //刪活動日記
    let deleteDiaryEventCommand = sql.deleteFrom('mood_cabin.diary_event')
                              .where('diary_id = ' + diaryId)
                              .gen();
    await connect(deleteDiaryEventCommand);

    //刪心情日記
    let deleteDiaryMoodCommand = sql.deleteFrom('mood_cabin.diary_mood')
                                    .where('diary_id = ' + diaryId)
                                    .gen();
    await connect(deleteDiaryMoodCommand);

    //刪廣場貼文
    const deletePostCommand = sql.deleteFrom('mood_cabin.square')
                                 .where('diary_id =' + diaryId)
                                 .gen();
    await connect(deletePostCommand);

    //刪日記
    let deleteDiaryCommand = sql.deleteFrom('mood_cabin.diary')
                                .where('diary_id = ' + diaryId)
                                .gen();
    await connect(deleteDiaryCommand);

    res.json({"msg" : "success"})
})
module.exports = router;
