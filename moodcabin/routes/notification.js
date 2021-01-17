var express = require('express');
var router = express.Router();
var sql = require('../utils/SQLCommand');
const sqlController = require('../controllers/SQLController');
var dateFunction = require('../utils/date');
const connect = require('../utils/index').connect;

//判斷是否需要推播，有可能需要傳處在哪個chatroomId中。query要有userId、chatroomId
router.get('/isNotified/', async function(req, res, next){
    const userId = req.query.userId;
    const chatroomId = req.query.chatroomId;

    console.log("userId = " + userId);
    let getNotificationIdCommand;
    //尋找有沒有需要推播的訊息
    if (!chatroomId){
        getNotificationIdCommand = sql.select('notification_id')
                                      .from('mood_cabin.notification')
                                      .where("target_user_id = '" + userId + "'")
                                      .gen();
    }
    else{
        getNotificationIdCommand = sql.select('notification_id')
                                      .from('mood_cabin.notification')
                                      .where("target_user_id = '" + userId + "'")
                                      .and('chatroom_id <> ' + chatroomId)
                                      .gen();
    }

    const resultNotificationId = await connect(getNotificationIdCommand);
    if (resultNotificationId.length == 0){
        res.json({msg: 'false'})
    }else{
        let notificationId = [];
        for (let i of resultNotificationId){
            notificationId.push(i.notification_id);
        }
        res.json({msg: 'true',
                notificationId})
    }
})

//給推播的詳細內容。body要有notificationId陣列
router.post('/content', async function(req, res, next){
    const notificationIdArr = req.body.notificationId;
    if(notificationIdArr){
        console.log(notificationIdArr[0]);
    }else{
        console.log("notificationIdArr is null")
    }

    //預期輸出格式
    let output = {
        notify:[]
    }
    let singleNotify = {
        chatroomId: "",
        myName:"",
        othersName:"",
        text:"",
        send_time:""
    }
    
    let orCondition = "( notification_id = " + notificationIdArr[0] +") ";
    for (let i = 1; i < notificationIdArr.length; i++){
        orCondition += sql.or("( notification_id = " + notificationIdArr[i] + ") ").gen(); 
    }
    const getNotificationCommand = sql.select('chatroom_id, name, text, send_time')
                                      .from('mood_cabin.notification')
                                      .where(orCondition)
                                      .orderBy('send_time', 'ASC')
                                      .gen();
    const resultNotification = await connect(getNotificationCommand);
    console.log(getNotificationCommand)
    for (let i of resultNotification){
        singleNotify = {
            chatroomId: "",
            myName:"",
            othersName:"",
            text:"",
            send_time:""
        }

        var nameObj = await sqlController.nameObj(i.chatroom_id);

        singleNotify.chatroomId = i.chatroom_id;
        singleNotify.othersName = i.name;
        if (Object.values(nameObj)[0] == i.name){
            singleNotify.myName = Object.values(nameObj)[1];
        }
        else{
            singleNotify.myName = Object.values(nameObj)[0];
        }        
        singleNotify.text = i.text;
        singleNotify.send_time = dateFunction.transform(i.send_time);
        output.notify.push(singleNotify);
    }
    
    //一旦通知送達就刪除通知裡的資訊
    const deleteNotificationCommand = sql.deleteFrom('mood_cabin.notification')
                                         .where(orCondition)
                                         .gen();
    await connect(deleteNotificationCommand);
    
    res.json(output);
    
})


module.exports = router;