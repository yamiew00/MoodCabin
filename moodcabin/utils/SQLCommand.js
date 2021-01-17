let sql = {
    str:'',
    isValues: false,
    //select && from
    select: function selection(column){
        let arguments = selection.arguments;
        this.str += 'SELECT ';
        for (let i = 0; i < arguments.length; i++){
            this.str += arguments[i] + ',';
        }
        this.str = this.str.substring(0, this.str.length - 1) + ' ';
        return this;
    },
    from: function (table){
        this.str += 'FROM ' + table + ' ';
        return this;
    },
    
    //insert into && values
    insertInto: function insertion(tableAndColumns){
        let arguments = insertion.arguments;
        this.str += 'INSERT INTO ' + arguments[0] + ' ';
        //若有指定輸入值
        if(arguments.length > 1){
            this.str += '('
            for (let i = 1; i < arguments.length; i++){
                this.str += arguments[i] + ',';
            }
            this.str = this.str.substring(0, this.str.length - 1) + ') ';
        }
        return this;
    },

    values: function valueFun(inputs){
        let arguments = valueFun.arguments;
        //多重新增
        if(this.isValues == true){
            this.str += ',(';
            for (let i = 0; i < arguments.length; i++){
                this.str += arguments[i] + ',';
            }
            this.str = this.str.substring(0, this.str.length - 1) + ') ';
            return this;
        }

        //單項新增
        this.str += 'VALUES (';
        for (let i = 0; i < arguments.length; i++){
            if (typeof arguments[i] == "number"){
                this.str += arguments[i] + ',';
            }
            else{
                this.str += "'" + arguments[i] + "'" + ',';
            }
        }
        this.str = this.str.substring(0, this.str.length - 1) + ') ';
        isValues = true;
        return this;
    },

    //where && and、or && in、between-and
    where: function (condition){
        this.str += 'WHERE ' + condition + ' ';
        return this;
    },
    and: function(condition){
        this.str += 'AND ' + condition + ' '; 
        return this;
    },
    or: function(condition){
        this.str += 'OR ' + condition + ' '; 
        return this;
    },
    in: function(condition){
        this.str += 'IN ' + condition + ' '; 
        return this;
    },
    between: function(condition1, condition2){
        this.str += "BETWEEN  '"+ condition1 + "' AND '" + condition2 + "' ";
        return this;
    },


    //排序order by
    // orderBy: function()
    orderBy: function(column, orderRule){
        this.str += "ORDER BY " + column + " " + orderRule + " ";
        return this;
    },


    //join
    innerJoin: function(table){
        this.str += "INNER JOIN " + table + " ";
        return this;
    },
    on:function(condition){
        this.str += "ON " + condition + " ";
        return this;
    },

    //limit
    limit: function(number){
        this.str+= "LIMIT " + number + " ";
        return this;
    },

    //update
    update: function(table){
        this.str += "UPDATE " + table + " ";
        return this;
    },
    set: function(condition){
        this.str += "SET " + condition + " ";
        return this;
    },
    comma: function(condition){
        this.str += ", " + condition + " ";
        return this;
    },

    //delete
    deleteFrom: function(table){
        this.str += "DELETE FROM " + table + " ";
        return this;
    },

    //取回新資料的id
    lastInsertId : function(){
        this.str += "SELECT LAST_INSERT_ID() id";
        return this;
    },

    //生成
    gen: function(){
        let output = this.str;
        this.str = '';
        this.isValues = false;
        return output;
    }
}

//SELECT * FROM my_table 
const select1 = sql.select('*')
        .from('my_table')
        .gen();
//SELECT name,age,price FROM another_table
const select2 = sql.select('name', 'age', 'price')
        .from('another_table')
        .gen();

//INSERT INTO customer VALUES ('Andy',23)
const insert1 = sql.insertInto('customer')
         .values( 'Andy' , 23)
         .gen();
//INSERT INTO customer (name,age,birthday) VALUES ('Andy',23,'1995-01-02')        
const insert2 = sql.insertInto('customer', 'name', 'age', 'birthday')
         .values('Andy' , 23, '1995-01-02')
         .gen();
//INSERT INTO customer (name,age,birthday) VALUES ('Andy',23,'1995-01-02'), ('Cindy', 27, '1999-03-11'), ('Mary', 18, '1990-07-14')           
const insert3 = sql.insertInto('customer', 'name', 'age', 'birthday')
         .values('Andy' , 23, '1995-01-02')
         .values('Cindy', 27, '1999-03-11')
         .values('Mary', 18, '1990-07-14')
         .gen();
//↓條件式↓ 
//SELECT name FROM customer WHERE age > 20 AND age < 26
const where1 = sql.select('name')
         .from('customer')
         .where('age > 20')
         .and('age < 26')
         .gen();
//SELECT name FROM customer WHERE birthday BETWEEN  '1994-01-01' AND '1999-12-31'
const where2 = sql.select('name')
         .from('customer')
         .where('birthday')
         .between('1994-01-01', '1999-12-31')
         .gen();


module.exports = sql; 