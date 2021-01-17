var express = require('express');
var router = express.Router();
const sql = require('../utils/SQLCommand');
const sqlController = require('../controllers/SQLController');
const dateFunction = require('../utils/date');
const connect = require('../utils/index').connect;
const { insertInto, update } = require('../utils/SQLCommand');


//1.廣場功能 (最大篇數n篇!!!!! 存在超過一定時間則刪除，之後記得做)
//(1)貼文，body要有hostName、postDate、post、diaryId
router.post('/square/post', async function(req, res, next){
    const hostName = req.body.hostName;
    const postDate = req.body.postDate;
    const post = req.body.post;
    const diaryId = req.body.diaryId;

    //檢查有沒有貼文 
    const userId = await sqlController.getUserByDiary(diaryId);
    const getUserListCommand = sql.select('D.user_id')
                                  .from('mood_cabin.square S')
                                  .innerJoin('mood_cabin.diary D')
                                  .on('S.diary_id = D.diary_id')
                                  .gen();
    const resultUserList = await connect(getUserListCommand);
    for (let i of resultUserList){
        if(userId == i.user_id){
            res.json({msg: "重複貼文!"})
            return;
        }
    }

    //貼文
    const insertPostCommand = sql.insertInto('mood_cabin.square (diary_id, host_name, post_date, post, count_room)')
                                 .values(diaryId, hostName, postDate, post, 0)
                                 .gen();
    await connect(insertPostCommand);

    res.json({"msg": "success"});
})

//(2)讀取廣場全貼文(按時間)，params要有userId
router.get('/square/all/:userId', async function(req, res, next){
    const userId = req.params.userId;

    //預期輸出格式
    let output = {
        square:[]
    }
    let singlePost = {
        hostName:"",
        postDate:"",
        post:"",
        diaryId:"",
        diary:{}
    }

    //選全部
    const getAllPostCommand = sql.select('S.diary_id, S.host_name, S.post_date, S.post, D.user_id')
                                 .from('mood_cabin.square S')
                                 .innerJoin('mood_cabin.diary D')
                                 .on('S.diary_id = D.diary_id')
                                 .where("user_id <> '" + userId + "'")
                                 .orderBy('post_date', 'DESC')
                                 .gen();
    
    const resultAllPost = await connect(getAllPostCommand);

    for (let i of resultAllPost){
        singlePost = {
            hostName:"",
            postDate:"",
            post:"",
            diaryId:"",
            diary:{
                record_date: "",
                mood:{},
                event : {},
                content :""
            }
        }
        singlePost.hostName = i.host_name;
        singlePost.postDate = dateFunction.transform(i.post_date);
        singlePost.post = i.post;
        singlePost.diaryId = i.diary_id;

        //拿日記的相關內容
        // singlePost.diary = await sqlController.getDiaryById(i.diary_id);
        const getDiaryCommand = sql.select('record_date, content, user_id')
                                   .from('mood_cabin.diary')
                                   .where('diary_id = ' + i.diary_id)
                                   .gen();
        const resultDiary = (await connect(getDiaryCommand))[0];
        const userId = resultDiary.user_id;
        singlePost.diary.record_date = dateFunction.transform(resultDiary.record_date);
        singlePost.diary.content = resultDiary.content;

        //拿diaryMood相關內容
        const getDiaryMoodCommand = sql.select('M.mood_name,  DM.score, M.icon')
                                       .from('mood_cabin.diary_mood DM')
                                       .innerJoin('mood_cabin.mood M')
                                       .on('DM.mood_id = M.mood_id')
                                       .where('diary_id = ' + i.diary_id)
                                       .and('DM.score > 0')
                                       .orderBy('DM.score', 'DESC')
                                       .gen();
        const resultDiaryMood = await connect(getDiaryMoodCommand);
        for (let j of resultDiaryMood){
            //預期的心情輸出格式
            let tmpObj = {
                icon:"",
                score:"",
            }
            tmpObj.icon = j.icon;
            tmpObj.score = j.score;
            singlePost.diary.mood[j.mood_name] = tmpObj;
        }

        //拿diaryEvent相關內容
        const getDiaryEventCommand = sql.select('event_name, icon')
                                        .from('mood_cabin.diary_event DE')
                                        .innerJoin('mood_cabin.event E')
                                        .on('DE.event_id = E.event_id')
                                        .where('diary_id = ' + i.diary_id)
                                        .and('DE.is_done = 1')
                                        .orderBy('DE.event_type_id', 'ASC')
                                        .gen();
        const resultDiaryEvent = await connect(getDiaryEventCommand);
        for (let j of resultDiaryEvent){
            singlePost.diary.event[j.event_name] = j.icon;
        }
        output.square.push(singlePost);
    }
    res.json(output)
})

//(3)得到自己的貼文，params要有userId
router.get('/square/mine/:userId', async function(req, res, next){
    const userId = req.params.userId;
    //預期輸出格式
    let output = {
        msg:'success',
        hostName:"",
        postDate:"",
        post:"",
        diary:{
            record_date:"",
            mood:{},
            event:[],
            content:""
        }
    }

    //取得廣場上貼文
    const getPostCommand = sql.select('host_name, post_date, post, D.diary_id')
                              .from('mood_cabin.square S')
                              .innerJoin('mood_cabin.diary D')
                              .on('S.diary_id = D.diary_id')
                              .where("user_id = '" + userId + "'")
                              .gen();
    let resultPost = await connect(getPostCommand);

    //檢查有沒有貼文
    if (resultPost.length == 0){
        res.json({msg : "該用戶沒有貼文"})
        return;
    }
    else{
        resultPost = resultPost[0];
        output.hostName = resultPost.host_name;
        output.postDate = dateFunction.transform(resultPost.post_date);
        output.post = resultPost.post;

        //取得日記
        // output.diary = await sqlController.getDiaryById(resultPost.diary_id);
        const getDiaryCommand = sql.select('record_date, content, user_id')
                                   .from('mood_cabin.diary')
                                   .where('diary_id = ' + resultPost.diary_id)
                                   .gen();
        const resultDiary = (await connect(getDiaryCommand))[0];
        output.diary.record_date = dateFunction.transform(resultDiary.record_date);
        output.diary.content = resultDiary.content;

        //取得diaryMood
        const getDiaryMoodCommand = sql.select('M.mood_name,  DM.score')
                                       .from('mood_cabin.diary_mood DM')
                                       .innerJoin('mood_cabin.mood M')
                                       .on('DM.mood_id = M.mood_id')
                                       .where('diary_id = ' + resultPost.diary_id)
                                       .and('DM.score > 0')
                                       .orderBy('DM.score', 'DESC')
                                       .gen();
        const resultDiaryMood = await connect(getDiaryMoodCommand);
        for (let i of resultDiaryMood){
            output.diary.mood[i.mood_name] = i.score
        }

        //取得diaryEvent
        const getDiaryEventCommand = sql.select('event_name')
                                        .from('mood_cabin.diary_event DE')
                                        .innerJoin('mood_cabin.event E')
                                        .on('DE.event_id = E.event_id')
                                        .where('diary_id = ' + resultPost.diary_id)
                                        .and('DE.is_done = 1')
                                        .orderBy('DE.event_type_id', 'ASC')
                                        .gen();
        const resultDiaryEvent = await connect(getDiaryEventCommand);
        for (let i of resultDiaryEvent){
            output.diary.event.push(i.event_name)
        }

        res.json(output);
    }
})

//(4)編輯自己的貼文，body要有userId、post。編輯到一半貼文有可能不見!!!!!
router.post('/square/edit', async function(req, res, next){
    const userId = req.body.userId;
    const post = req.body.post;

    try{
        //找到自己貼文的id
        const getSquareIdCommand = sql.select('S.square_id')
                                    .from('mood_cabin.square S')
                                    .innerJoin('mood_cabin.diary D')
                                    .on('S.diary_id = D.diary_id')
                                    .where("user_id = '" + userId + "'")
                                    .gen();
        const squareId = (await connect(getSquareIdCommand))[0].square_id;
        
        //編輯
        const updateSquareCommand = sql.update('mood_cabin.square')
                                    .set("post = '" + post + "'")
                                    .where('square_id = ' + squareId)
                                    .gen();
        await connect(updateSquareCommand);
        res.json({msg: 'success'});
    }catch(err){
        res.json({msg: "貼文已不存在"})
        return;
    }
    
    
})

//(5)刪除自己的貼文，params要有userId。刪之前貼文有可能不見
router.post('/square/delete/:userId', async function(req, res, next){
    const userId = req.params.userId;
    try{
        //找到自己貼文的id
        const getSquareIdCommand = sql.select('S.square_id')
                                    .from('mood_cabin.square S')
                                    .innerJoin('mood_cabin.diary D')
                                    .on('S.diary_id = D.diary_id')
                                    .where("user_id = '" + userId + "'")
                                    .gen();
        const squareId = (await connect(getSquareIdCommand))[0].square_id;
        //刪除
        const deletePostCommand = sql.deleteFrom('mood_cabin.square')
                                     .where('square_id = ' + squareId)
                                     .gen();
        await connect(deletePostCommand);
        res.json({msg: 'success'});
        return;
    }catch(err){
        res.json({msg : "用戶沒有貼文"})
    }
})


//2.聊天室功能
//(1)建造新房間，body要有diaryId、hostName、userId、guestName。
//對方聊天室上限只能有三個!!   (還沒做)
//造新房間的同時還要通知對方!! (還沒做)
router.post('/chatroom/create', async function(req, res, next){
    const diaryId = req.body.diaryId;
    const hostName = req.body.hostName;
    const userId = req.body.userId;
    const guestName = req.body.guestName;
    const text = req.body.text;

    //檢查該貼文的聊天室數量
    const getCountRoomCoummand = sql.select('count_room')
                                    .from('mood_cabin.square')
                                    .where('diary_id = ' + diaryId)
                                    .gen();
    let resultCountRoom = (await connect(getCountRoomCoummand))[0];
    if (!resultCountRoom){
        res.json({msg: '對方聊天室達上限'})
        return;
    }else{
        resultCountRoom = resultCountRoom.count_room;
    }

    //創立房間
    const createRoomCommand = sql.insertInto('mood_cabin.chatroom (diary_id, guest_id, host_name, guest_name, state)')
                                 .values(diaryId, userId, hostName, guestName, 2)
                                 .gen();
    try{
        await connect(createRoomCommand);
    }catch(err){
        if(err.code == 'ER_DUP_ENTRY'){
            res.json({msg: '已有此房間'});
            return;
        }
    }

    //拿回剛剛建立的chatroom的id
    const getChatroomIdCommand =sql.lastInsertId()
                                   .gen();
    const resultChatroomId = (await connect(getChatroomIdCommand))[0].id;

    //建立第一條訊息
        //現在時間
    let sendTime = new Date();
    sendTime.setHours(sendTime.getHours() + 8);
    sendTime = dateFunction.transformToSecond(sendTime);
    const createMessageCommand = sql.insertInto('mood_cabin.message(chatroom_id, text, user_id, send_time)')
                                    .values(resultChatroomId, text, userId, sendTime)
                                    .gen();
    await connect(createMessageCommand);

    //通知系統
    const target_user_id = await sqlController.getUserByDiary(diaryId);
    const insertNotificationCommand = sql.insertInto('mood_cabin.notification (chatroom_id, target_user_id, from_user_id, name, send_time, text)')
                                         .values(resultChatroomId, target_user_id, userId, guestName, sendTime, text)
                                         .gen();
    await connect(insertNotificationCommand);

    
    //若該貼文聊天室將達到三則，則刪除此貼文。否則count++
    if (resultCountRoom == 2){
        const deletePostCommand = sql.deleteFrom('mood_cabin.square')
                                     .where('diary_id = ' + diaryId)
                                     .gen();
        await connect(deletePostCommand);
    }
    else{
        const updateCountRoomCommand = sql.update('mood_cabin.square')
                                          .set('count_room = ' + (resultCountRoom + 1))
                                          .where('diary_id = ' + diaryId)
                                          .gen();
        await connect(updateCountRoomCommand)
    }
    
    res.json({msg: 'success',
        chatRoomId : resultChatroomId});
})

//(2)發訊，body要有chatroomId, userId, text
//發新訊息的時候還要通知對方!! (還沒做)
router.post('/chatroom/send', async function(req, res, next){
    const chatroomId = req.body.chatroomId;
    const userId = req.body.userId;
    const text = req.body.text;

    
    //現在時間
    let sendTime = new Date();
    sendTime.setHours(sendTime.getHours() + 8);
    sendTime = dateFunction.transformToSecond(sendTime);
    //存下訊息
    const insertMessageCommand = sql.insertInto('mood_cabin.message (chatroom_id, text, user_id, send_time)')
                                    .values(chatroomId, text, userId, sendTime)
                                    .gen();
    await connect(insertMessageCommand);
    
    //拿回剛剛發出訊息的id
    const messageId = await sqlController.getNewId();


    //發訊系統
    const nameObj = await sqlController.nameObj(chatroomId);
    let from_user_id;
    let target_user_id;
    if (userId == Object.keys(nameObj)[0]){
        from_user_id = userId;
        target_user_id = Object.keys(nameObj)[1];
    }
    else{
        from_user_id = userId;
        target_user_id = Object.keys(nameObj)[0];
    }

    //先檢查發訊系統中有沒有已在排程中的訊息
    const getNotificationIdCommand = sql.select('notification_id')
                                        .from('mood_cabin.notification')
                                        .where("chatroom_id = '" + chatroomId + "'")
                                        .and("from_user_id = '" + from_user_id + "'")
                                        .gen();
    const resultNotificationId = (await connect(getNotificationIdCommand))[0];
    if (!resultNotificationId){
        const insertNotificationCommand = sql.insertInto('mood_cabin.notification (chatroom_id, target_user_id, from_user_id, name, send_time, text)')
                                            .values(chatroomId, target_user_id, from_user_id, nameObj[from_user_id], sendTime, text)
                                            .gen();
        await connect(insertNotificationCommand);
    }
    else{
        const updateNotificationCommand = sql.update('mood_cabin.notification')
                                             .set("send_time = '" + sendTime + "'")
                                             .comma("text ='" + text + "'")
                                             .where('notification_id = ' + resultNotificationId.notification_id)
                                             .gen();
        await connect(updateNotificationCommand);

    }
    res.json({messageId});
})

//(3)，頻繁訪問，轉去別的地方做


//(4)讀取「20篇」訊息，params要有chatroomId。
//若userId為空代表是系統發訊
router.get('/chatroom/load/:chatroomId', async function(req, res, next){
    const chatroomId = req.params.chatroomId;
    
    //限制送出的條數
    const limit = 20;

    //預期輸出格式
    let output = {
        chat:[]
    }
    let singleChat = {
        messageId : "",
        name: "",
        text: "",
        sendTime : ""
    }

    //userId與name的配對關係
    const nameObj = await sqlController.nameObj(chatroomId);
    
    //拿到最新的20筆message
    const getMessageCommand1 = sql.select('message_id, user_id, text, send_time')
                                 .from('mood_cabin.message')
                                 .where('chatroom_id = ' + chatroomId)
                                 .orderBy('send_time', 'DESC')
                                 .limit(limit)
                                 .gen();
    const getMessageCommand2 = sql.select('*')
                                  .from('(' + getMessageCommand1 + ') A ')
                                  .orderBy('A.send_time', 'ASC')
                                  .gen();
    const resultMessage = await connect(getMessageCommand2);
    for (let i of resultMessage){
        singleChat = {
            messageId : "",
            name: "",
            text: "",
            sendTime : ""
        }
        singleChat.messageId = i.message_id;
        singleChat.name = (i.user_id == undefined)? '<系統>': nameObj[i.user_id];
        singleChat.text = i.text;
        singleChat.sendTime = dateFunction.transform(i.send_time);
        output.chat.push(singleChat);
    }
    res.json(output)
})

//(5)分享日記，body要有diaryId, chatroomId，還沒做!!!!
router.post('/chatroom/share', async function (req, res, next){
    const diaryId = req.body.diaryId;
    const chatroomId = req.body.chatroomId;

    //userId與name的配對關係
    const nameObj = await sqlController.nameObj(chatroomId);
    const userId = await sqlController.getUserByDiary(diaryId);

    
    
})

//(6)讀取歷史訊息，query要有chatroomId, messageId
router.get('/chatroom/history', async function(req, res, next){
    const chatroomId = req.query.chatroomId;
    const messageId = req.query.messageId;

    //預期輸出格式
    let output = {
        chat:[]
    }
    let singleChat = {
        messageId : "",
        name: "",
        text: "",
        sendTime : ""
    }

    //拿到這條訊息發訊時間
    const getSendTimeCommand = sql.select('send_time')
                                  .from('mood_cabin.message')
                                  .where('message_id = ' + messageId)
                                  .gen();
    const resultSendTime = dateFunction.transformToSecond((await connect(getSendTimeCommand))[0].send_time);
    
    //算出目前已顯示幾條訊息
    const getCountMessageCommand = sql.select('count(chatroom_id) count')
                                      .from('mood_cabin.message')
                                      .where('chatroom_id = ' + chatroomId)
                                      .and("send_time >= '" + resultSendTime + "'")
                                      .gen();
    const resultCountMessgae = (await connect(getCountMessageCommand))[0].count;

    //userId與name的配對關係
    const nameObj = await sqlController.nameObj(chatroomId);
    
    //多送20條訊息
    const limit = resultCountMessgae + 20;
    const getMessageCommand1 = sql.select('message_id, user_id, text, send_time')
                                  .from('mood_cabin.message')
                                  .where('chatroom_id = ' + chatroomId)
                                  .orderBy('send_time', 'DESC')
                                  .limit(limit)
                                  .gen();
    const getMessageCommand2 = sql.select('*')
                                  .from('(' + getMessageCommand1 + ') A ')
                                  .orderBy('A.send_time', 'ASC')
                                  .gen();
    const resultMessage = await connect(getMessageCommand2);
    for (let i of resultMessage){
        singleChat = {
            messageId : "",
            name: "",
            text: "",
            sendTime : ""
        }
        singleChat.messageId = i.message_id;
        singleChat.name = (i.user_id == undefined)? '<系統>': nameObj[i.user_id];
        singleChat.text = i.text;
        singleChat.sendTime = dateFunction.transform(i.send_time);
        output.chat.push(singleChat);
    }
    res.json(output);
})

//(7)離房，body要有chatroomId、userId
//一方離房則另一方不能發訊(前端阻止)；兩方離房則刪除此房間。
router.post('/chatroom/leave', async function(req, res, next){
    const chatroomId = req.body.chatroomId;
    const userId = req.body.userId;
    
    //拿到該房間資訊
    const getRoomCommand = sql.select('diary_id, guest_id, host_name, guest_name, state')
                              .from('mood_cabin.chatroom')
                              .where('chatroom_id = ' + chatroomId)
                              .gen();
    const resultRoom = (await connect(getRoomCommand))[0];


    //拿到兩方的id
    const hostUserId = await sqlController.getUserByDiary(resultRoom.diary_id);
    const guestUserId = resultRoom.guest_id;
    
    //兩人都在房間的情形
    if (resultRoom.state == 2){
        //系統發離開訊息
        let sendTime = new Date();
        sendTime.setHours(sendTime.getHours() + 8);
        const leaveMessageCommand = sql.insertInto('mood_cabin.message (chatroom_id, text, send_time)')
                                        .values(chatroomId, '對方已離開聊天室', dateFunction.transformToSecond(sendTime))
                                        .gen();
        await connect(leaveMessageCommand);

        //host case:
        if (hostUserId == userId){
            const updateStateCommand = sql.update('mood_cabin.chatroom')
                                          .set('state = 0')
                                          .where('chatroom_id = ' + chatroomId)
                                          .gen();
            await connect(updateStateCommand);
        }
        //guest case:
        else{
            const updateStateCommand = sql.update('mood_cabin.chatroom')
                                          .set('state = 1')
                                          .where('chatroom_id = ' + chatroomId)
                                          .gen();
            await connect(updateStateCommand);
        }
    }
    //只剩一人的情形:刪除聊天室
    else{
        //先刪除全訊息
        const deleteMessageCommand = sql.deleteFrom('mood_cabin.message')
                                        .where('chatroom_id = ' + chatroomId)
                                        .gen();
        await connect(deleteMessageCommand);

        //刪除聊天室
        const deleteChatroomCommand = sql.deleteFrom('mood_cabin.chatroom')
                                         .where('chatroom_id = ' + chatroomId)
                                         .gen();
        await connect(deleteChatroomCommand);
    }
    res.json({msg: 'success'});
    
})


//3.聊天列表，依時間排序。null的在最下面
router.get('/chatlist/all/:userId', async function(req, res, next){
    const userId = req.params.userId;
    
    //預期輸出格式
    let output = {
        chats : []
    }
    let singleChat = {
        chatroomId: "",
        myName: "",
        othersName: "",
        latestMsg:"",
        latestTime:""
    }

    //找此用戶所處的聊天室
    const getChatlistCommand = sql.select('C.chatroom_id,C.host_name, C.state, D.user_id, C.guest_name, C.guest_id')
                                  .from('mood_cabin.chatroom C')
                                  .innerJoin('mood_cabin.diary D')
                                  .on('C.diary_id = D.diary_id')
                                  .where("(D.user_id = '" + userId + "' and C.state <> 0)")
                                  .or("(C.guest_id = '" + userId + "' and C.state <> 1)")
                                  .gen();
    const resultChatlist = await connect(getChatlistCommand);

    for (let i of resultChatlist){
        singleChat = {
            chatroomId: "",
            myName: "",
            othersName: "",
            latestMsg:"",
            latestTime:""
        }
        //用戶是host
        if (i.user_id == userId){
            singleChat.chatroomId = i.chatroom_id;
            singleChat.myName = i.host_name;
            singleChat.othersName = i.guest_name;
            
            //顯示最新訊息
            const getMessageCommand = sql.select('text, send_time')
                                         .from('mood_cabin.message')
                                         .where('chatroom_id = ' + i.chatroom_id)
                                         .orderBy('send_time', 'DESC')
                                         .limit(1)
                                         .gen();
            const resultMessage = (await connect(getMessageCommand))[0];
            singleChat.latestMsg = (resultMessage == undefined)? "null" : resultMessage.text;
            singleChat.latestTime = (resultMessage == undefined)? "null" : resultMessage.send_time;
            output.chats.push(singleChat);
        }
        //用戶是guest
        else if (i.guest_id == userId){
            singleChat.chatroomId = i.chatroom_id;
            singleChat.myName = i.guest_name;
            singleChat.othersName = i.host_name;
            
            //顯示最新訊息
            const getMessageCommand = sql.select('text, send_time')
                                         .from('mood_cabin.message')
                                         .where('chatroom_id = ' + i.chatroom_id)
                                         .orderBy('send_time', 'DESC')
                                         .limit(1)
                                         .gen();
            const resultMessage = (await connect(getMessageCommand))[0];
            singleChat.latestMsg = (resultMessage == undefined)? "null" : resultMessage.text;
            singleChat.latestTime = (resultMessage == undefined)? "null" : resultMessage.send_time;
            output.chats.push(singleChat);
        }
    }

    //按時間排序，null則最後
    let tmpArr = output.chats;
    for (let i = 0; i < tmpArr.length - 1; i++){
        for (let j = 0; j < tmpArr.length - 1 - i; j++){
            if (tmpArr[j].latestTime == "null"){
                let tmpObj = tmpArr[j];
                tmpArr[j] = tmpArr[j+1];
                tmpArr[j+1] = tmpObj;
                continue;
            }
            if (tmpArr[j+1].latestTime == "null") continue;
            if (tmpArr[j].latestTime < tmpArr[j+1].latestTime){
                let tmpObj = tmpArr[j];
                tmpArr[j] = tmpArr[j+1];
                tmpArr[j+1] = tmpObj;
            }
        }
    }
    
    
    //轉成時間格式
    for(let i = 0; i < tmpArr.length; i++){
        if (tmpArr[i].latestTime != "null"){
            tmpArr[i].latestTime = dateFunction.transform(tmpArr[i].latestTime);
        }
    }

    output.chats = tmpArr;
    res.json(output);
})


module.exports = router;