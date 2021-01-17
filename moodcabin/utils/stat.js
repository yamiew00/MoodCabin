const mean = function(arr){
    let sum = 0;
    for (let i in arr){
        sum += arr[i];
    }
    return sum / arr.length;
    
}

const std =  function(arr){
    let m =  mean(arr);
    let sum = 0;
    for (let i in arr){
        sum += (arr[i] - m) * (arr[i] - m);
    }
    return Math.sqrt(sum/arr.length);
}

var cov = function(arr1, arr2){
    return new Promise(
        (resolve, reject) =>{
            


    let mean1 = mean(arr1);
    let mean2 = mean(arr2);
    let sum = 0;
    for (let i in arr1){
        
        sum += ( (arr1[i] - mean1) * (arr2[i] - mean2) );
    }
    resolve(sum/arr1.length);
    // return sum/arr1.length;
        }
    )
}

var corr = async function(arr1, arr2){
    return new Promise(async function(resolve, reject) {
        let std1 = std(arr1);
        let std2 = std(arr2);
        var co = await cov(arr1, arr2);
        resolve(co/(std1 * std2));
    })
}




module.exports ={
    cov,
    corr
}