//str格式example： 1999-01-01 18:26
startofDate = function(str){
    let split =str.split('-');
    let year = split[0];
    let month = split[1];
    let day = split[2].split(' ')[0];
    let hour = split[2].split(' ')[1];

    return year + "-" + month + "-" + day + " " + 0;
}
endofDate = function(str){
    let split =str.split('-');
    let year = split[0];
    let month = split[1];
    let day = split[2].split(' ')[0];
    let hour = split[2].split(' ')[1];

    let result = "";
    return year + "-" + month + "-" + day + " " + 23;
}

//傳入格式：2020-12-15T14:34:00.000Z
transform = function(str){
    let result = new Date(Date.parse(str)); //把字串轉成Date格式
    let year = result.getFullYear();
    let month = result.getMonth() + 1;
    let day = result.getDate();
    let hour = result.getHours();
    let minute = result.getMinutes();
    return year + "-" +month + "-" +day + " " +hour + ":" +minute;
}
transformToSecond = function(str){
    let result = new Date(Date.parse(str)); //把字串轉成Date格式
    let year = result.getFullYear();
    let month = result.getMonth() + 1;
    let day = result.getDate();
    let hour = result.getHours();
    let minute = result.getMinutes();
    let second = result.getSeconds();
    return year + "-" +month + "-" +day + " " +hour + ":" + minute + ":" + second;
}

//傳入格式example: 1999-11
startOfMonth = function(str){
    let split =str.split('-');
    let year = split[0];
    let month = split[1];

    return year + "-" + month + "-" + "01";
}
endOfMonth = function(str){
    let split =str.split('-');
    let year = split[0];
    let month = split[1];
    
    if (month == 12){
        month = 1;
        year ++;
    }
    else{
        month ++;
    }

    return year + "-" + month + "-" + "01";
}



module.exports = {
    startofDate,
    endofDate,
    transform,
    transformToSecond,
    startOfMonth,
    endOfMonth
}