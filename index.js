const redis = require('redis');
var express = require('express');
var cors = require('cors');
var bodyParser = require('body-parser')
var moment = require('moment')
var natural = require('natural');
var jsonParser = bodyParser.json()
var app = express();
app.use(jsonParser);
app.use(cors());
const stopWords = ["call", "upon", "still", "nevertheless", "down", "every", "forty", "'re", "always", "whole", "side", "n't", "now", "however", "an", "show", "least", "give", "below", "did", "sometimes", "which", "'s", "nowhere", "per", "hereupon", "yours", "she", "moreover", "eight", "somewhere", "within", "whereby", "few", "has", "so", "have", "for", "noone", "top", "were", "those", "thence", "eleven", "after", "no", "'ll", "others", "ourselves", "themselves", "though", "that", "nor", "just", "'s", "before", "had", "toward", "another", "should", "herself", "and", "these", "such", "elsewhere", "further", "next", "indeed", "bottom", "anyone", "his", "each", "then", "both", "became", "third", "whom", "'ve", "mine", "take", "many", "anywhere", "to", "well", "thereafter", "besides", "almost", "front", "fifteen", "towards", "none", "be", "herein", "two", "using", "whatever", "please", "perhaps", "full", "ca", "we", "latterly", "here", "therefore", "us", "how", "was", "made", "the", "or", "may", "'re", "namely", "'ve", "anyway", "amongst", "used", "ever", "of", "there", "than", "why", "really", "whither", "in", "only", "wherein", "last", "under", "own", "therein", "go", "seems", "'m", "wherever", "either", "someone", "up", "doing", "on", "rather", "ours", "again", "same", "over", "'s", "latter", "during", "done", "'re", "put", "'m", "much", "neither", "among", "seemed", "into", "once", "my", "otherwise", "part", "everywhere", "never", "myself", "must", "will", "am", "can", "else", "although", "as", "beyond", "are", "too", "becomes", "does", "a", "everyone", "but", "some", "regarding", "'ll", "against", "throughout", "yourselves", "him", "'d", "it", "himself", "whether", "move", "'m", "hereafter", "re", "while", "whoever", "your", "first", "amount", "twelve", "serious", "other", "any", "off", "seeming", "four", "itself", "nothing", "beforehand", "make", "out", "very", "already", "various", "until", "hers", "they", "not", "them", "where", "would", "since", "everything", "at", "together", "yet", "more", "six", "back", "with", "thereupon", "becoming", "around", "due", "keep", "somehow", "n't", "across", "all", "when", "i", "empty", "nine", "five", "get", "see", "been", "name", "between", "hence", "ten", "several", "from", "whereupon", "through", "hereby", "'ll", "alone", "something", "formerly", "without", "above", "onto", "except", "enough", "become", "behind", "'d", "its", "most", "n't", "might", "whereas", "anything", "if", "her", "via", "fifty", "is", "thereby", "twenty", "often", "whereafter", "their", "also", "anyhow", "cannot", "our", "could", "because", "who", "beside", "by", "whence", "being", "meanwhile", "this", "afterwards", "whenever", "mostly", "what", "one", "nobody", "seem", "less", "do", "'d", "say", "thus", "unless", "along", "yourself", "former", "thru", "he", "hundred", "three", "sixty", "me", "sometime", "whose", "you", "quite", "'ve", "about", "even"]
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
        if (expenseBody['expenseType'] === "debit") {
            expensesJson['plantBalance'] = expensesJson['plantBalance'] - parseFloat(expenseBody['expenseAmount'])
        }
        else {
            expensesJson['plantBalance'] = expensesJson['plantBalance'] + parseFloat(expenseBody['expenseAmount'])
        }
        if (!expenseBody['isBackDateTrans']) {
            expenseBody["balance"] = expensesJson["plantBalance"];
            expensesJson["plant"].push(expenseBody);
        }
        else {
            let prevExp;
            let exp = expensesJson['plant']
            let counter = 0;
            for (let idx in exp) {
                if (moment(new Date(exp[idx]['expenseDate'])) > moment(new Date(expenseBody['expenseDate']))) {
                    let newTransId = parseFloat(prevExp['expTransId']) + 0.01;
                    expenseBody['expTransId'] = newTransId;
                    counter = idx;
                    break;
                }
                prevExp = exp[idx];
            }
            if (counter == 0) {
                expenseBody["balance"] = expensesJson["plantBalance"];
                expensesJson["plant"].push(expenseBody);
            }
            else {
                let finalArr = [];
                for (let i = 0; i < counter; i++) {
                    finalArr.push(exp[i]);
                }
                if (expenseBody['expenseType'] === 'credit') {
                    expenseBody['balance'] = parseFloat(expenseBody['expenseAmount'])+exp[counter-1]['balance'];
                }
                else {
                    expenseBody['balance'] = exp[counter-1]['balance'] - parseFloat(expenseBody['expenseAmount']);
                }
                finalArr.push(expenseBody);
                for (let j = counter; j < exp.length; j++) {
                    let modExp = exp[j];
                    if (expenseBody['expenseType'] === 'credit') {
                        modExp["balance"] = modExp["balance"] + parseFloat(expenseBody['expenseAmount']);
                    }
                    else {
                        modExp["balance"] = modExp["balance"] - parseFloat(expenseBody['expenseAmount']);
                    }
                    finalArr.push(modExp);
                }
                expensesJson["plant"] = finalArr;
            }
        }
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

// app.get("/testDB", async (req, res) => {
//     await client.connect();
//     let obj = { "plant": [{ "expenseFor": "plant", "expenseType": "credit", "expenseName": "starting balance", "expenseAmount": 3083, "expenseDate": "29-May-2024", "balance": 3083, "expTransId": 1 }], "plantBalance": 3083 }
//     await client.set('expenses', JSON.stringify(obj));
//     res.send("ok");
//     await client.disconnect();
// });

// app.get("/testDelete", async (req, res) => {
//     await client.connect();
//     await client.del('expenses');
//     res.send("ok");
//     await client.disconnect();
// });

// app.get("/testGet", async (req, res) => {
//     await client.connect();
//     let exp = await client.get('expenses');
//     res.send(JSON.parse(exp));
//     await client.disconnect();
// });

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
    let catExpense = {};
    if(req.params.cat === 'plant'){
        catExpense['plantBalance'] = expensesJson['plantBalance']
    }
    catExpense['records'] = expensesJson[req.params.cat];
    res.send(catExpense);
    await client.disconnect();
});

app.post("/retrieveHitWords", async(req, res) => {
    await client.connect();
    let allDescription = req.body.allDescription;
    var tokenizer = new natural.WordTokenizer();
    let freqObject = {};
    for(let desc of allDescription) {
        let tokens = tokenizer.tokenize(desc);
        for (let token of tokens) {
            if (token.length > 2) {
                if (!stopWords.some(word => word.toLowerCase() === token.toLowerCase())) {
                    if (freqObject[token]) {
                        freqObject[token] += 1
                    }
                    else {
                        freqObject[token] = 1
                    }
                }
            }
        }
    }
    res.send(freqObject);
});

// app.post("/deleteRecords", async (req, res) => {
//     const expenseArr = req.body.items;
//     await client.connect();
//     let expenses = await client.get('expenses');
//     let expensesJson = JSON.parse(expenses);
//     let existingArr = expensesJson['plant'];
//     let plantBalance = expensesJson['plantBalance']
//     let finalArr = [];
//     for (let exp of existingArr) {
//         if (expenseArr.includes(exp.expTransId)) {
//             if (exp.expenseType === "debit") {
//                 plantBalance += parseFloat(exp.expenseAmount);
//             }
//             else {
//                 plantBalance -= parseFloat(exp.expenseAmount);
//             }
//             continue;
//         }
//         else {
//             finalArr.push(exp);
//         }
//     }
//     expensesJson['plant'] = finalArr;
//     expensesJson['plantBalance'] = plantBalance;
//     await client.set("expenses", JSON.stringify(expensesJson));
//     await client.disconnect();
//     if (expenseArr.length == 1) {
//         res.send({ "status": "ok", "message": "1 record successfully deleted!", "plantBalance": plantBalance });
//     }
//     else {
//         res.send({ "status": "ok", "message": `${expenseArr.length} records successfully deleted!`, "plantBalance": plantBalance });
//     }
// });

app.listen(4001, () => {
    console.log('listening on port 4001');
})