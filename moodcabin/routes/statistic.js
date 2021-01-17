var express = require('express');
var router = express.Router();
let objSort = require('../utils/index').objSort;
let objSortByAbs = require('../utils/index').objSortByAbs;
const sql = require('../utils/SQLCommand');
var dateFunction = require('../utils/date');
const sqlController = require('../controllers/SQLController');
const connect = require('../utils/index').connect;
let stat = require('../utils/stat');
const util = require('../utils/util');
const decimal = require('../utils/decimal');

//用戶id與月分(最重要的兩個變數)
var userId;
var date;

//轉換成當月分的字串
var startOfMonth;
var endOfMonth;

//用戶擁有的心情、活動與其id的鍵值對
var moodObj;
var eventObj;

//query要有：userId、date
router.get('/default', async function(req, res, next){
   //接下前端傳入資料
   userId = req.query.userId;
   date = req.query.date;

   //用戶擁有的心情、活動 = {name: id}
   moodObj = await sqlController.moodObj(userId);
   eventObj = await sqlController.eventObj(userId);

   //按傳入的date，找出當月分首尾的字串
   startOfMonth = dateFunction.startOfMonth(date);
   endOfMonth = dateFunction.endOfMonth(date);

   //輸出格式
   var output = {
      chartN1:{},
      chartN0:{},
      chart1: {},
      chart2: {},
      chart3: {},
      chart4: {},
      chart5: {}
   };

   chart1();
   
   //造出5張 chart的function
   async function chart1(){
      //預期輸出樣式
      let output1 = {
         defaultEvent : "",
         mostOftenMood: {},
         defaultMoodScores:{
            "5分":"",
            "4分":"",
            "3分":"",
            "2分":"",
            "1分":""
         }
      };
      //預設的活動名
      let eventName = Object.keys(eventObj)[0];
      output1.defaultEvent = eventName;
      //存下輸出結果
      let tmp = await getMoodByEvent(eventName);
      output1.mostOftenMood = tmp.mostOftenMood;
      output1.defaultMoodScores = util.rename(tmp.moodScore);
      output.chart1 = output1;

      chart2();
   }

   async function chart2(){
      //預期輸出樣式
      var output2 ={
         defaultMood:"",
         mostOftenEvent:{},
         eventByMoodScore:{
            "5分":"null",
            "4分":"null",
            "3分":"null",
            "2分":"null",
            "1分":"null"
         }
      };

      output2.defaultMood = Object.keys(moodObj)[0];
      let tmp = await getEventByMood(Object.keys(moodObj)[0]);
      output2.mostOftenEvent = tmp.mostOftenEvent;
      output2.eventByMoodScore = util.rename(tmp.eventByMoodScore);
   

      output.chart2 = output2;
      chart3();
   }
   
   async function chart3(){
      //預期輸出格式
      let output3 = {
         "defaultEvent":"",
         "mostInfluenceMood":{},
         "defaultMoodAvg":[]
      }
      //預設顯示的活動
      output3.defaultEvent = Object.keys(eventObj)[0];
      
      let tmp = await getInfluenceMoodByEvent(Object.keys(eventObj)[0]);
      output3.mostInfluenceMood = tmp.mostInfluenceMood;
      output3.defaultMoodAvg = tmp.moodAvg;
      output.chart3 = output3;

      //輸出
      output.chart3 = output3;
      chart4();
   }
   
   async function chart4(){
      //預期輸出樣式
      output4 = {
         defaultMood:"",
         moodStability:"insufficient data",
         defaultMoodScore:{
            "5分":"null",
            "4分":"null",
            "3分":"null",
            "2分":"null",
            "1分":"null"
         }
      }

      output4.defaultMood = Object.keys(moodObj)[0];
      
      //回傳心情穩定度
      let tmp = await getMoodStability(Object.keys(moodObj)[0]);
      output4.moodStability = tmp.moodStability;
      output4.defaultMoodScore = util.rename(tmp.moodScore);

      output.chart4 = output4;
      chart5();
   }
   
   async function chart5(){
      //預期輸出樣式
      let output5 = {
         "defaultMood": "",
         "mostRelevantMood":{},
         "avgMoodByMood":{
            "5分":"null",
            "4分":"null",
            "3分":"null",
            "2分":"null",
            "1分":"null"
         }
      };
      output5.defaultMood = Object.keys(moodObj)[0];
      let tmp = await getRelevantMoodByMood(Object.keys(moodObj)[0]);
      output5.mostRelevantMood = tmp.mostRelevantMood;
      output5.avgMoodByMood = util.rename(tmp.avgMoodByMood);

      //輸出最後結果
      output.chart5 = output5;
      chartN1();
      // res.json(output)
   }
   async function chartN1(){
      //預期輸出樣式
      let outputN1 = {
         "moodDistribution":{
         }
      };
      
      for (let i in moodObj){
         const moodDistributionCommand = sql.select('count(score) count')
                                            .from('mood_cabin.diary_mood DM')
                                            .innerJoin('mood_cabin.diary D')
                                            .on('DM.diary_id = D.diary_id')
                                            .where('record_date')
                                            .between(startOfMonth, endOfMonth)
                                            .and('score > 0')
                                            .and('mood_id = ' + moodObj[i])
                                            .gen();
         const resultMoodDistribution = (await connect(moodDistributionCommand))[0].count;
         if (resultMoodDistribution == 0){
            continue;
         }
         outputN1.moodDistribution[i] = resultMoodDistribution;
      }
      outputN1.moodDistribution = objSort(outputN1.moodDistribution);
      output.chartN1 = outputN1;
      chartN0();
   }
   async function chartN0(){
      //預期輸出樣式
      let outputN0 = {
         "eventDistribution":{
         }
      };
      
      for(let i in eventObj){
         const eventDistributionCommand = sql.select('count(is_done) count')
                                             .from('mood_cabin.diary_event DE')
                                             .innerJoin('mood_cabin.diary D')
                                             .on('D.diary_id = DE.diary_id')
                                             .where('record_date')
                                             .between(startOfMonth, endOfMonth)
                                             .and('is_done = 1')
                                             .and('event_id = ' + eventObj[i])
                                             .gen();
         const resultEventDistribution = (await connect(eventDistributionCommand))[0].count;
         if(resultEventDistribution == 0){
            continue;
         }
         outputN0.eventDistribution[i] = resultEventDistribution;
      }
      outputN0.eventDistribution = objSort(outputN0.eventDistribution)
      output.chartN0 = outputN0
      res.json(output)
   }  
});




//chart1額外功能。query要有：userId、date、event
router.get('/chart1/update', async function(req, res, next){
   //接下前端傳入資料
   userId = req.query.userId;
   date = req.query.date;
   let eventName = req.query.event;

   //用戶擁有的心情、活動 = {name: id}
   moodObj = await sqlController.moodObj(userId);
   eventObj = await sqlController.eventObj(userId);

   //按傳入的date，找出當月分首尾的字串
   startOfMonth = dateFunction.startOfMonth(date);
   endOfMonth = dateFunction.endOfMonth(date);

   //輸出
   let tmp = await getMoodByEvent(eventName);
   let result = {};
   result.mostOftenMood = tmp.mostOftenMood;
   result.chosenMoodScore = util.rename(tmp.moodScore);
   res.json(result);
})
//chart1額外功能。query要有：userId、date、event、mood
router.get('/chart1/onClicked', async function(req, res, next){
   //接下前端傳入資料
   userId = req.query.userId;
   date = req.query.date;
   let eventName = req.query.event;
   let moodName = req.query.mood;

   //用戶擁有的心情、活動 = {name: id}
   moodObj = await sqlController.moodObj(userId);
   eventObj = await sqlController.eventObj(userId);

   //按傳入的date，找出當月分首尾的字串
   startOfMonth = dateFunction.startOfMonth(date);
   endOfMonth = dateFunction.endOfMonth(date);

   //預期輸出樣式
   let chosenMoodScore = {}

   //按1到5分去找
   for (let i = 5; i >= 1; i--){
      let command = sql.select('count(score) count')
                             .from('mood_cabin.diary_event E')
                             .innerJoin('mood_cabin.diary D')
                             .on('E.diary_id = D.diary_id')
                             .innerJoin('mood_cabin.diary_mood M')
                             .on('M.diary_id = D.diary_id')
                             .where('D.record_date')
                             .between(startOfMonth, endOfMonth)
                             .and('E.event_id = ' + eventObj[eventName])
                             .and('E.is_done = 1')
                             .and('M.mood_id = ' + moodObj[moodName])
                             .and('M.score = ' + i)
                             .gen();
      let connOutput = await connect(command);
      chosenMoodScore[i + "分"] = connOutput[0].count;
   }
   //輸出
   res.json(chosenMoodScore);
})


//chart2額外功能。query要有：userId、date、mood
router.get('/chart2/update', async function(req, res, next){
   //接下前端傳入資料
   userId = req.query.userId;
   date = req.query.date;
   let moodName = req.query.mood;

   //用戶擁有的心情、活動 = {name: id}
   moodObj = await sqlController.moodObj(userId);
   eventObj = await sqlController.eventObj(userId);

   //按傳入的date，找出當月分首尾的字串
   startOfMonth = dateFunction.startOfMonth(date);
   endOfMonth = dateFunction.endOfMonth(date);

   
   let result = await getEventByMood(moodName);
   result.eventByMoodScore = util.rename(result.eventByMoodScore);
   res.json(result);
})


//chart3額外功能。query要有：userId、date、event
router.get('/chart3/update', async function(req, res, next){
   //接下前端傳入資料
   userId = req.query.userId;
   date = req.query.date;
   let eventName = req.query.event;

   //用戶擁有的心情、活動 = {name: id}
   moodObj = await sqlController.moodObj(userId);
   eventObj = await sqlController.eventObj(userId);

   //按傳入的date，找出當月分首尾的字串
   startOfMonth = dateFunction.startOfMonth(date);
   endOfMonth = dateFunction.endOfMonth(date);

   let result = await getInfluenceMoodByEvent(eventName);
   res.json(result);
})
//chart3額外功能。query要有：userId、date、event、mood
router.get('/chart3/onClicked', async function(req, res, next){
   //接下前端傳入資料
   userId = req.query.userId;
   date = req.query.date;
   let eventName = req.query.event;
   let moodName = req.query.mood;

   //用戶擁有的心情、活動 = {name: id}
   moodObj = await sqlController.moodObj(userId);
   eventObj = await sqlController.eventObj(userId);

   //按傳入的date，找出當月分首尾的字串
   startOfMonth = dateFunction.startOfMonth(date);
   endOfMonth = dateFunction.endOfMonth(date);

   //預期輸出格式
   let output = {
      "moodAvg":[]
   }
   let moodAvg = [];

   //選取指定心情後，找其在有執行特定活動下的平均值
   let getIsDoneAvgCommand = sql.select('Avg(MOOD.score) avg')
                                 .from('mood_cabin.diary_event EVENT')
                                 .innerJoin('mood_cabin.diary DIARY')
                                 .on('EVENT.diary_id = DIARY.diary_id')
                                 .innerJoin('mood_cabin.diary_mood MOOD')
                                 .on('DIARY.diary_id = MOOD.diary_id')
                                 .where('DIARY.record_date')
                                 .between(startofDate, endOfMonth)
                                 .and('event_id = ' + eventObj[eventName])
                                 .and('is_done = 1')
                                 .and('MOOD.mood_id = ' + moodObj[moodName])
                                 .gen();
   let getNotDoneAvgCommand = sql.select('Avg(MOOD.score) avg')
                                 .from('mood_cabin.diary_event EVENT')
                                 .innerJoin('mood_cabin.diary DIARY')
                                 .on('EVENT.diary_id = DIARY.diary_id')
                                 .innerJoin('mood_cabin.diary_mood MOOD')
                                 .on('DIARY.diary_id = MOOD.diary_id')
                                 .where('DIARY.record_date')
                                 .between(startofDate, endOfMonth)
                                 .and('event_id = ' + eventObj[eventName])
                                 .and('is_done = 0')
                                 .and('MOOD.mood_id = ' + moodObj[moodName])
                                 .gen();
   let resultisDone = await connect(getIsDoneAvgCommand);
   let resultNotDone = await connect(getNotDoneAvgCommand);
   
   

   //resultisDone、resultNotDone可能為null
   if (resultisDone[0].avg == null || resultNotDone[0].avg == null){
      res.json(null);
      return;
   }

   output.moodAvg[0] = resultisDone[0].avg.toFixed(1);
   output.moodAvg[1] = resultNotDone[0].avg.toFixed(1);

   res.json(output);
})

//chart4額外功能。query要有：userId、date、mood
router.get('/chart4/update', async function(req, res, next){
   //接下前端傳入資料
   userId = req.query.userId;
   date = req.query.date;
   let moodName = req.query.mood;

   //用戶擁有的心情、活動 = {name: id}
   moodObj = await sqlController.moodObj(userId);
   eventObj = await sqlController.eventObj(userId);

   //按傳入的date，找出當月分首尾的字串
   startOfMonth = dateFunction.startOfMonth(date);
   endOfMonth = dateFunction.endOfMonth(date);

   let tmp = await getMoodStability(moodName);
   tmp.moodScore = util.rename(tmp.moodScore);
   res.json(tmp)
})


//chart5額外功能。query要有：userId、date、mood
router.get('/chart5/update', async function(req, res, next){
   //接下前端傳入資料
   userId = req.query.userId;
   date = req.query.date;
   let moodName = req.query.mood;

   //用戶擁有的心情、活動 = {name: id}
   moodObj = await sqlController.moodObj(userId);
   eventObj = await sqlController.eventObj(userId);

   //按傳入的date，找出當月分首尾的字串
   startOfMonth = dateFunction.startOfMonth(date);
   endOfMonth = dateFunction.endOfMonth(date);

   let result = await getRelevantMoodByMood(moodName);
   result.avgMoodByMood = util.rename(result.avgMoodByMood);
   res.json(result);
})
//chart5額外功能。query要有：userId、date、defaultMood、chosenMood
router.get('/chart5/onClicked', async function(req, res, next){
      let output = {
         avgMoodByMood : {
            "5分":"null",
            "4分":"null",
            "3分":"null",
            "2分":"null",
            "1分":"null",
         }
      }


      //接下前端傳入資料
      userId = req.query.userId;
      date = req.query.date;
      let defaultMood = req.query.defaultMood;
      let chosenMood = req.query.chosenMood;
      
      //用戶擁有的心情 = {name: id}
      moodObj = await sqlController.moodObj(userId);

      //按傳入的date，找出當月分首尾的字串
      startOfMonth = dateFunction.startOfMonth(date);
      endOfMonth = dateFunction.endOfMonth(date);


      //第三步，求5~1分的平均
      
      try{
         //5到1分
         for (let i = 5; i >= 1; i--){
            const getDiaryCommand = sql.select('D.diary_id')
                                       .from('mood_cabin.diary_mood M')   
                                       .innerJoin('mood_cabin.diary D')
                                       .on('M.diary_id = D.diary_id')
                                       .where('D.record_date')
                                       .between(startOfMonth, endOfMonth)
                                       .and('mood_id = ' + moodObj[defaultMood])
                                       .and('score = ' + i)
                                       .gen();
            let result = await connect(getDiaryCommand);
            //按照diary_id去抓平均值
            if (result.length == 0){
               //變成0，預設為null
               continue;
            }
            

            //寫長的or(sql語法)
            let orString = ("(diary_id = " + result[0].diary_id) + " ";
            let tmpStr2 = "";
            for (let j = 0; j < result.length - 1;j++){
               tmpStr2 += 'OR diary_id = ' + result[j+1].diary_id + " ";
            }
            orString += tmpStr2 + ")";
            //拿到特定diary_id的下特定mood_id平均
            let getAvgCommand = sql.select('avg(score) avg')
                                    .from('mood_cabin.diary_mood')
                                    .where('mood_id = ' + moodObj[chosenMood])
                                    .and(orString)
                                    .gen();
            let avg = await connect(getAvgCommand);
            output.avgMoodByMood[i + "分"] = (avg[0].avg).toFixed(1);
         }
      }catch(err){
         console.log(err);
      }
      res.json(output);

})

//函式區
async function getMoodByEvent(eventName){
   return new Promise(async function(resolve, reject) {
      ////預期輸出樣式
      var output = {
         mostOftenMood: {},
         moodScore:{
            "1":"",
            "2":"",
            "3":"",
            "4":"",
            "5":""
         }
      };
   
      let tmpObj = {};
      for (let i in moodObj){
         //在預設的event_id下找全部mood_id的score>0時的總數
         let commandChart1_1 = sql.select('count(score) count')
                                .from('mood_cabin.diary_event E')
                                .innerJoin('mood_cabin.diary D')
                                .on('E.diary_id = D.diary_id')
                                .innerJoin('mood_cabin.diary_mood M')
                                .on('M.diary_id = D.diary_id')
                                .where('D.record_date')
                                .between(startOfMonth, endOfMonth)
                                .and('E.event_id = ' + eventObj[eventName])
                                .and('E.is_done = 1')
                                .and('M.mood_id = ' + moodObj[i])
                                .and('M.score > 0')
                                .gen();
         let moodCount = await connect(commandChart1_1);
         tmpObj[i] = moodCount[0].count;
      }
      output.mostOftenMood = objSort(tmpObj);
   
      //Default1-2在預設的event_id下找特定mood_id的score時的總數
      let targetMoodId = moodObj[Object.keys(output.mostOftenMood)[0]];
      for (let i = 1; i <= 5; i++){
         let commandChart1_2 = sql.select('count(score) count')
                                .from('mood_cabin.diary_event E')
                                .innerJoin('mood_cabin.diary D')
                                .on('E.diary_id = D.diary_id')
                                .innerJoin('mood_cabin.diary_mood M')
                                .on('M.diary_id = D.diary_id')
                                .where('D.record_date')
                                .between(startOfMonth, endOfMonth)
                                .and('E.event_id = ' + eventObj[eventName])
                                .and('E.is_done = 1')
                                .and('M.mood_id = ' + targetMoodId)
                                .and('M.score = ' + i)
                                .gen();
         let moodCount = await connect(commandChart1_2);
         output.moodScore[i] = moodCount[0].count;
      }
      resolve(output);
   })
}
async function getEventByMood(moodName){
   return new Promise(async function(resolve, reject){
      //預期輸出樣式
      var output ={
         mostOftenEvent:{},
         eventByMoodScore:{
            "5":{"null": 0},
            "4":{"null": 0},
            "3":{"null": 0},
            "2":{"null": 0},
            "1":{"null": 0}
         }
      };
      
      //算累計數
      for (let i in eventObj){
         let command = sql.select('count(C.is_done) count')
                           .from('mood_cabin.diary_mood A')
                           .innerJoin('mood_cabin.diary B')
                           .on('A.diary_id = B.diary_id')
                           .innerJoin('mood_cabin.diary_event C')
                           .on('B.diary_id = C.diary_id')
                           .where('B.record_date')
                           .between(startOfMonth, endOfMonth)
                           .and('A.mood_id = ' + moodObj[moodName])
                           .and('A.score > 0')
                           .and('C.event_id = ' + eventObj[i])
                           .and('C.is_done = 1')
                           .gen();

         let result = await connect(command);
         output.mostOftenEvent[i] = result[0].count;
      }

      //資料排序，多的往前放
      output.mostOftenEvent = objSort(output.mostOftenEvent);

      //若內容超過三筆則只留三筆
      if (Object.keys(output.mostOftenEvent).length > 3){
         let tmpObj = {};
         for (let i = 0; i < 3; i++){
            tmpObj[Object.keys(output.mostOftenEvent)[i]] = Object.values(output.mostOftenEvent)[i];
         }
         output.mostOftenEvent = tmpObj;
      }

      secondStep();

      //算1~5分時，事件發生的次數
      async function secondStep(){
         for (let i = 5; i >= 1; i --){
            let maxCount = 0;
            for (let j in eventObj){
               let getEventCount = sql.select('count(is_done) count')
                                    .from('mood_cabin.diary_mood A')
                                    .innerJoin('mood_cabin.diary B')
                                    .on('A.diary_id = B.diary_id')
                                    .innerJoin('mood_cabin.diary_event C')
                                    .on('B.diary_id = C.diary_id')
                                    .where('B.record_date')
                                    .between(startOfMonth, endOfMonth)
                                    .and('mood_id = ' + moodObj[moodName])
                                    .and('score = ' + i)                    //5到1分
                                    .and('C.event_id = ' + eventObj[j])
                                    .and('C.is_done = 1')
                                    .gen();
               let moodScore = await connect(getEventCount);
               if (moodScore[0].count > maxCount){
                  maxCount = moodScore[0].count;
                  output.eventByMoodScore[i] = {};
                  output.eventByMoodScore[i][j] = maxCount ;
               }
            }
         }

         resolve(output);
      }
   })
}
async function getInfluenceMoodByEvent(eventName){
   return new Promise(async function(resolve, reject){
      //預期輸出樣式
      let output = {
         "mostInfluenceMood":{},
         "moodAvg":[]
      }
      
      //依照全心情找有活動、沒活動的日記平均值
      let maxDifference = 0; //存下平均值的最大差距
      for (let i in moodObj){
         let getIsDoneAvgCommand = sql.select('Avg(MOOD.score) avg')
                                 .from('mood_cabin.diary_event EVENT')
                                 .innerJoin('mood_cabin.diary DIARY')
                                 .on('EVENT.diary_id = DIARY.diary_id')
                                 .innerJoin('mood_cabin.diary_mood MOOD')
                                 .on('DIARY.diary_id = MOOD.diary_id')
                                 .where('DIARY.record_date')
                                 .between(startofDate, endOfMonth)
                                 .and('event_id = ' + eventObj[eventName])
                                 .and('is_done = 1')
                                 .and('MOOD.mood_id = ' + moodObj[i])
                                 .gen();
         let getNotDoneAvgCommand = sql.select('Avg(MOOD.score) avg')
                                 .from('mood_cabin.diary_event EVENT')
                                 .innerJoin('mood_cabin.diary DIARY')
                                 .on('EVENT.diary_id = DIARY.diary_id')
                                 .innerJoin('mood_cabin.diary_mood MOOD')
                                 .on('DIARY.diary_id = MOOD.diary_id')
                                 .where('DIARY.record_date')
                                 .between(startofDate, endOfMonth)
                                 .and('event_id = ' + eventObj[eventName])
                                 .and('is_done = 0')
                                 .and('MOOD.mood_id = ' + moodObj[i])
                                 .gen();
         let resultisDone = await connect(getIsDoneAvgCommand);
         let resultNotDone = await connect(getNotDoneAvgCommand);
         
         //resultisDone、resultNotDone可能為null
         if (resultisDone[0].avg == null || resultNotDone[0].avg == null){
            continue;
         }

         let difference = decimal(Math.round(resultisDone[0].avg * 10) / 10 - Math.round(resultNotDone[0].avg * 10) / 10);
         //存下絕對值最大時的兩個心情平均值
         if (Math.abs(difference) > maxDifference){
            maxDifference = Math.abs(difference);
            output.moodAvg =[];
            output.moodAvg[0] = decimal(Math.round(resultisDone[0].avg * 10) / 10);
            output.moodAvg[1] = decimal(Math.round(resultNotDone[0].avg * 10) / 10);
         }

         output.mostInfluenceMood[i] = difference;
      }
      //按絕對值排序
      output.mostInfluenceMood = objSortByAbs(output.mostInfluenceMood);
      
      resolve(output)
   })
}
async function getMoodStability(moodName){
   //預期輸出樣式
   output = {
      moodStability:"需要更多紀錄!",
      moodScore:{
         "5":"",
         "4":"",
         "3":"",
         "2":"",
         "1":""
      }
   }

   //1.檢查資料筆數有沒有達到五筆
   let getCountCommand = sql.select('count(score) count')
                     .from('mood_cabin.diary_mood M')
                     .innerJoin('mood_cabin.diary D')
                     .on('M.diary_id = D.diary_id')
                     .where('D.record_date')
                     .between(startOfMonth, endOfMonth)
                     .and('mood_id = ' + moodObj[moodName])
                     .and('score > 0')
                     .gen();
   let count = await connect(getCountCommand);

   //達五筆則計算變異數，轉換成穩定分
   if(count[0].count >= 5){
      let getVarianceCommand = sql.select('variance(score) var')
                           .from('mood_cabin.diary_mood M')
                           .innerJoin('mood_cabin.diary D')
                           .on('M.diary_id = D.diary_id')
                           .where('D.record_date')
                           .between(startOfMonth, endOfMonth)
                           .and('mood_id = ' + moodObj[moodName])
                           .and('score > 0')
                           .gen();
      let variance = await connect(getVarianceCommand);
      output.moodStability = (-25*variance[0].var + 100).toFixed(0);
   }

   //列出當月分該心情的1~5分的分布
   try{
      for (let i = 5; i >= 1; i--){
         let getMoodScoreCommand =  sql.select('count(score) count')
                              .from('mood_cabin.diary_mood M')
                              .innerJoin('mood_cabin.diary D')
                              .on('M.diary_id = D.diary_id')
                              .where('D.record_date')
                              .between(startOfMonth, endOfMonth)
                              .and('mood_id = ' + moodObj[moodName])
                              .and('score = ' + i)
                              .gen();
         
            let count = await connect(getMoodScoreCommand);
            output.moodScore[i] = count[0].count;
      }
   }catch(err){
      console.log(err);
   }
   
   return output;
}
async function getRelevantMoodByMood(moodName){
   return new Promise(async function(resolve, reject){
      //預期輸出格式
      let output = {
         "mostRelevantMood":{},
         "avgMoodByMood":{
            "1":"null",
            "2":"null",
            "3":"null",
            "4":"null",
            "5":"null",
         }
      };
      
      //記下全心情的分數陣列的物件
      let moodArrs = {};
      for (let i in moodObj){
         let getScoreArr = sql.select('score')
                              .from('mood_cabin.diary_mood M')
                              .innerJoin('mood_cabin.diary D')
                              .on('M.diary_id = D.diary_id')
                              .where('D.record_date')
                              .between(startOfMonth, endOfMonth)
                              .and('mood_id = ' + moodObj[i])
                              .gen();
         let result = await connect(getScoreArr);
         let tmpArr = [];
         for (let j = 0; j < result.length; j++){
            tmpArr.push(result[j].score);
         }

         let tmpKeyName = i;
         moodArrs[tmpKeyName] = tmpArr;
      }
      secondStep();

      //第二步，求與其他心情的相關係數
      async function secondStep(){
         
         //只有一種心情，直接結束(心情至少擁有一種)
         if (Object.keys(moodArrs).length == 1){
            resolve(output);
         }

         let CorrObj = {};
         for (let i in moodArrs){
            if (i == moodName){
               continue;
            }
            let corr = await stat.corr(moodArrs[moodName], moodArrs[i]);
            //需判斷corr是不是NaN或Infinity
            CorrObj[i] = (!isNaN(corr) && isFinite(corr))? (corr * 50 + 50).toFixed(0): 'null';
         }

         //若CorrObj不為空則重新排列
         if (Object.keys(CorrObj).length > 0){
            output.mostRelevantMood = objSortByAbs(CorrObj);
         }
         thirdStep(Object.keys(output.mostRelevantMood)[0]);
      }
      //第三步，求5~1分的平均
      async function thirdStep(targetMoodName){
         try{
            //5到1分
            for (let i = 5; i >= 1; i--){
               const getDiaryCommand = sql.select('D.diary_id')
                                          .from('mood_cabin.diary_mood M')   
                                          .innerJoin('mood_cabin.diary D')
                                          .on('M.diary_id = D.diary_id')
                                          .where('D.record_date')
                                          .between(startOfMonth, endOfMonth)
                                          .and('mood_id = ' + moodObj[moodName])
                                          .and('score = ' + i)
                                          .gen();
               let result = await connect(getDiaryCommand);
               //按照diary_id去抓平均值
               if (result.length == 0){
                  //變成0，預設為null
                  continue;
               }
               

               //寫長的or(sql語法)
               let orString = ("(diary_id = " + result[0].diary_id) + " ";
               let tmpStr2 = "";
               for (let j = 0; j < result.length - 1;j++){
                  tmpStr2 += 'OR diary_id = ' + result[j+1].diary_id + " ";
               }
               orString += tmpStr2 + ")";
               //#default 5-3，拿到特定diary_id的下特定mood_id(95)平均
               let getAvgCommand = sql.select('avg(score) avg')
                                       .from('mood_cabin.diary_mood')
                                       .where('mood_id = ' + moodObj[targetMoodName])
                                       .and(orString)
                                       .gen();
               let avg = await connect(getAvgCommand);
               output.avgMoodByMood[i] = (avg[0].avg).toFixed(1);
            }
         }catch(err){
            console.log(err);
         }
         resolve(output);
      }

   });
   
}

module.exports = router;