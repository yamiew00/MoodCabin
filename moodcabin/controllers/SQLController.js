const con = require('../utils/index').con;
const sql = require('../utils/SQLCommand');
const connect = require('../utils/index').connect;
const objSortASC = require('../utils/index').objSortASC;
const dateFunction = require('../utils/date');

//使用者擁有的心情、活動、活動種類
let moodObj =  function(userId){
    return new Promise((resolve, reject) =>{
        let output = {};
        let getMood = sql.select('mood_id, mood_name')
                        .from('mood_cabin.mood')
                        .where("user_id = '" + userId + "'")
                        .gen();
        con.query(getMood, function(err, result){
            if (err) throw err;
            for (let i in result){
                output[result[i].mood_name] = result[i].mood_id;
            }
            output = objSortASC(output);
            resolve(output);
        })
    })
} 
let eventObj = function(userId){
    return new Promise((resolve, reject) =>{
        let output = {};
        let getEvent = sql.select('event_id', 'event_name')
                     .from('mood_cabin.event')
                     .where("user_id = '" + userId + "'")
                     .gen();
        con.query(getEvent, function(err, result){
            for (let i in result){
                output[result[i].event_name] = result[i].event_id;
            }
            output = objSortASC(output);
            resolve(output);
        })

    })
}
async function eventTypeObj(userId){
    return new Promise((resolve, reject) =>{
        let output = {};
        let getEvent = sql.select('event_type_id', 'event_type_name')
                     .from('mood_cabin.event_type')
                     .where("user_id = '" + userId + "'")
                     .gen();
        con.query(getEvent, function(err, result){
            for (let i in result){
                output[result[i].event_type_name] = result[i].event_type_id;
            }
            output = objSortASC(output);
            resolve(output);
        })

    })
}
//userId與name的配對關係，要注意null的情況
async function nameObj(chatroomId){
    return new Promise( async (resolve, reject) =>{
        //預期輸出格式
        output = {};
        //拿到chatRoom
        const getChatroomCommand = sql.select('diary_id, guest_id, host_name, guest_name')
                                      .from('mood_cabin.chatroom')
                                      .where('chatroom_id = ' + chatroomId)
                                      .gen();
        let resultChatroom = await connect(getChatroomCommand);
        if (resultChatroom.length == 0){
            console.log('function nameObj gets nothing')
            return null;
        }
        else{
            resultChatroom = resultChatroom[0];
            //拿到user_id
            const getUserIdCommand = sql.select('user_id')
                                        .from('mood_cabin.diary')
                                        .where('diary_id = ' + resultChatroom.diary_id)
                                        .gen();
            const resultUserId = (await connect(getUserIdCommand))[0].user_id;
            if (!resultUserId){
                console.log("resultUserId gets nothing");
                return (null);
            }
            
            //輸出
            output[resultUserId] = resultChatroom.host_name;
            output[resultChatroom.guest_id] = resultChatroom.guest_name;
            resolve(output);
        }

    })
}


async function getMoodAndEvent(userId){
    return new Promise(async function(resolve, reject){
        //預期輸出格式
        let output ={
            mood:{},
            event:{}
        }
        
        //找心情
        let getMoodCommand = sql.select('mood_name, icon')
                                .from('mood_cabin.mood')
                                .where("user_id = '" + userId + "'")
                                .orderBy('mood_id', 'ASC')
                                .gen();
        let resultMood = await connect(getMoodCommand);
        for (let i = 0; i < resultMood.length; i++){
            output.mood[resultMood[i].mood_name] = resultMood[i].icon; 
        }
        
        
        //找活動種類
        let getEventTypeCommand = sql.select('event_type_id, event_type_name')
                                     .from('mood_cabin.event_type')
                                     .where("user_id = '" + userId +"'")
                                     .orderBy('event_type_id', 'ASC')
                                     .gen();
        let resultEventType = await connect(getEventTypeCommand);
        
        //按活動種類去搜底下的心情
        for (let i = 0; i < resultEventType.length; i++){
            let getEventCommand = sql.select('event_name, icon')
                                     .from('mood_cabin.event')
                                     .where('event_type_id = ' + resultEventType[i].event_type_id)
                                     .gen();
            let resultEvent = await connect(getEventCommand);
            let tmpObj = {};
            for (let j = 0; j < resultEvent.length; j++){
                tmpObj[resultEvent[j].event_name] = resultEvent[j].icon;
            }
            output.event[resultEventType[i].event_type_name] = tmpObj;
        }
        resolve(output);
    })
}

//藉由diary_id 拿到user_id
async function getUserByDiary(diaryId){
    return new Promise(async (resolve, reject)=>{
        const getUserIdCommand = sql.select('user_id')
                                    .from('mood_cabin.diary')
                                    .where('diary_id = ' + diaryId)
                                    .gen();
        const result = (await connect(getUserIdCommand))[0].user_id;
        if (!result){
            console.log("function getUserByDiary gets nothing");
            resolve(null);
        }
        resolve(result);
    })
}

//取回新資料的id
async function getNewId(){
    return new Promise(async (resolve, reject)=>{
        const getIdCommand = sql.lastInsertId().gen();
        const newId = (await connect(getIdCommand))[0].id;
        if (newId == 0){
            console.log("function getNewId gets nothing!!")
        }
        resolve(newId);
    })
}

//依diaryId取得diary內容
async function getDiaryById(diaryId){
    return new Promise( async (resolve, reject) =>{
        //預期輸出格式
        let output = {
            "record_date": "",
            "mood" : [],
            "event" :[],
            "content": ""
        }

        //取得diary及user_id
        const getDiaryCommand = sql.select('user_id, record_date, content')
                                .from('mood_cabin.diary')
                                .where('diary_id = ' + diaryId)
                                .gen();
        const resultDiary = (await connect(getDiaryCommand))[0];
        const userId = resultDiary.user_id;
        output.record_date = dateFunction.transform(resultDiary.record_date);
        output.content = resultDiary.content;
        
        //取得diary_mood
        const getMoodDiaryCommand = sql.select('score')
                                    .from('mood_cabin.diary_mood')
                                    .where('diary_id = ' + diaryId)
                                    .orderBy('mood_id', 'ASC')
                                    .gen();
        const resultMoodDiary = await connect(getMoodDiaryCommand);
        for (let i = 0; i < resultMoodDiary.length; i++){
            output.mood.push(resultMoodDiary[i].score);
        }
        
        //拿到活動種類
        let eventTypeObj = {};
        const getEventTypeCommand = sql.select('event_type_id', 'event_type_name')
                                       .from('mood_cabin.event_type')
                                       .where("user_id = '" + userId + "'")
                                       .gen();
        const resultEventType = await connect(getEventTypeCommand);
        for (let i of resultEventType){
            eventTypeObj[i.event_type_name] = i.event_type_id;
        }
        eventTypeObj = objSortASC(eventTypeObj);


        //取得diary_event
        for (let i in eventTypeObj){
            let tmpArr = [];
            const getIsdoneCommand = sql.select('is_done')
                                        .from('mood_cabin.diary_event')
                                        .where('diary_id = ' + diaryId)
                                        .and('event_type_id = ' + eventTypeObj[i])
                                        .orderBy('event_id','ASC')
                                        .gen();
            const resultIsdone = await connect(getIsdoneCommand);
            for (let j = 0; j < resultIsdone.length; j++){
                tmpArr.push(resultIsdone[j].is_done)
            }
            output.event.push(tmpArr)
        }
        resolve(output);
    })

    
}



module.exports = {
    moodObj,
    eventObj,
    eventTypeObj,
    getMoodAndEvent,
    getUserByDiary,
    getNewId,
    getDiaryById,
    nameObj
}