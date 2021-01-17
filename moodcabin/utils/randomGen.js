//隨機整數(min~max)
function random(min, max){
    if (min > max){
        let tmp = min;
        min = max;
        max = tmp;
    }
    return (Math.floor(Math.random() *(max - min + 1) + min));
}
//輸入格式 2020-12
function day(monthString){
    let year = monthString.split("-")[0];
    let month = monthString.split("-")[1];
    let maxDay;
    switch(month){
        case 1:
        case 3:
        case 5:
        case 7:
        case 8:
        case 10:
        case 12:
            maxDay = 31;
            break;
        case 2:
            if (year % 4 == 0)
                maxDay = 29;
            else
                maxDay = 28;
            break;
        default:
            maxDay = 30;
    }
    return monthString + "-" + random(1,maxDay) + " " + random(0, 23) + ":" + random(0,59);
}

module.exports = {
    random,
    day
}