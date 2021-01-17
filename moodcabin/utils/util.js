//input範例：{ '1': 0, '2': 1, '3': 0, '4': 0, '5': 1 }，只有五個。會輸出顯示成5unit到1unit的物件
const rename = function (input){
    let output = {};
    for (let i = 5; i >= 1; i--){
        output[i + "分"] = Object.values(input)[i - 1];
    }
    return output;
}

module.exports = {
    rename
}