var mysql = require("mysql");
const con = mysql.createConnection({
    host: "35.201.247.105",
    user: "root",
    password: "nimiew00",
    port: 3306,
    charset : 'utf8mb4'
  });

//排序
//物件按value值排序
const objSort = function(input){
  let output = {};
  //bubble sort
  let key = Object.keys(input);
  let value = Object.values(input);
  for (let i = 0 ; i < value.length - 1; i ++){
      for (let j = 0; j < value.length - 1 - i; j++){
          if (value[j] < value[j + 1]){
              //同步交換
              let tmpValue = value[j];
              value[j] = value[j+1];
              value[j+1] = tmpValue;

              let tmpKey = key[j];
              key[j] = key[j+1];
              key[j+1] = tmpKey;
          }
      }
  }
  
  for (let i in key){
      output[key[i]] = value[i];
  }
  return output;
}
const objSortASC = function(input){
    let output = {};
  //bubble sort
  let key = Object.keys(input);
  let value = Object.values(input);
  for (let i = 0 ; i < value.length - 1; i ++){
      for (let j = 0; j < value.length - 1 - i; j++){
          if (value[j] > value[j + 1]){
              //同步交換
              let tmpValue = value[j];
              value[j] = value[j+1];
              value[j+1] = tmpValue;

              let tmpKey = key[j];
              key[j] = key[j+1];
              key[j+1] = tmpKey;
          }
      }
  }
  
  for (let i in key){
      output[key[i]] = value[i];
  }
  return output;
}
//物件按絕對值排序
const objSortByAbs = function(input){
    let output = {};
    //bubble sort
    let key = Object.keys(input);
    let value = Object.values(input);
    for (let i = 0 ; i < value.length - 1; i ++){
        for (let j = 0; j < value.length - 1 - i; j++){
            if (Math.abs(value[j]) < Math.abs(value[j + 1])){
                //同步交換
                let tmpValue = value[j];
                value[j] = value[j+1];
                value[j+1] = tmpValue;
  
                let tmpKey = key[j];
                key[j] = key[j+1];
                key[j+1] = tmpKey;
            }
        }
    }
    
    for (let i in key){
        output[key[i]] = value[i];
    }
    return output;
  }
//能await的連線
const connect = function(sqlString){
    return new Promise((resolve, reject) =>{
        con.query(sqlString, function(err, result){
            if (err) {
                console.log(err);
                reject(err);
            }
            else{
                resolve(result);
            }
        })
    })
}


module.exports = {
    con,
    objSort,
    objSortASC,
    objSortByAbs,
    connect
};
