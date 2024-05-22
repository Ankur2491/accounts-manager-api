const redis = require('redis');
var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser')
var jsonParser = bodyParser.json()
var app = express();
app.use(jsonParser);
app.use(cors());
var client = redis.createClient({
    socket: {
        host: "redis-13985.c90.us-east-1-3.ec2.redns.redis-cloud.com",
        port: 13985
    }
    , password: "IXiIq7sVwjasWzCPBcx89k6wG2CRuuIx"
});
app.post('/addExpense', async (req, res) => {
    const expenseBody = req.body;
    await client.connect();
    if (expenseBody['expenseFor'] === "plant") {
        let expenses = await client.get('expenses');
        if (expenses == null) {
            let obj = { "plant": [], "plantBalance": expenseBody['expenseAmount'] };
            expenses = JSON.stringify(obj);
        }
        expensesJson = JSON.parse(expenses);
        if (expensesJson['expenseType'] === "debit") {
            expensesJson['plantBalance'] = expensesJson['plantBalance'] - parseFloat(expenseBody['expenseAmount'])
        }
        else {
            expensesJson['plantBalance'] = expensesJson['plantBalance'] + parseFloat(expenseBody['expenseAmount'])
        }
        expenseBody["balance"] = expensesJson["plantBalance"];
        expensesJson["plant"].push(expenseBody);
        await client.set("expenses", JSON.stringify(expensesJson));
        await client.disconnect();
        res.send("ok");
    }
    else {
        let expenses = await client.get('expenses');
        if (expenses == null) {
            expenses = { "plant": [], [expenseBody['expenseFor']]: [] };
        }
        expensesJson = JSON.parse(expenses);
        if (expensesJson[expenseBody['expenseFor']]) {
            expensesJson[expenseBody['expenseFor']].push(expenseBody);
        }
        else {
            expensesJson[expenseBody['expenseFor']] = [expenseBody];
        }
        await client.set("expenses", JSON.stringify(expensesJson));
        await client.disconnect();
        res.send("ok");
    }
   
})

app.get("/testDB", async (req, res) => {
    await client.connect();
    let expenses = await client.get('expenses');  
    res.send(JSON.parse(expenses));
    await client.disconnect();
});

app.get("/getAllCat", async (req, res) => {
    await client.connect();
    let expenses = await client.get('expenses');
    let expensesJson = JSON.parse(expenses);
    let categories = Object.keys(expensesJson);
    let idx = categories.indexOf("plantBalance");
    if(idx>-1){
        categories.splice(idx,1);
    }
    res.send(categories);
    await client.disconnect();
});

app.get("/getExpDetails/:cat", async(req, res) => {
    await client.connect();
    let expenses = await client.get('expenses');
    let expensesJson = JSON.parse(expenses);
    let catExpense = expensesJson[req.params.cat];
    res.send(catExpense);
    await client.disconnect();
});

app.listen(4001, () => {
    console.log('listening on port 4001');
})