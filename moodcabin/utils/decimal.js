function decimal(num, precision = 12){
    return parseFloat(num.toPrecision(precision));
}

module.exports = decimal;