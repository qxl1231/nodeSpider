const https = require('https');
const cheerio = require('cheerio');
const fs = require('fs');
const startPage = 1; // 开始页
const endPage = 2000; // 结束页
var jexcel = require('json2excel');

let page = startPage; // 当前抓取页
let total = 0; // 数据总数

// 初始化url
// const url = 'https://wx.fang.lianjia.com/loupan/';//链家
const url = 'https://wx.fang.ke.com/loupan';// 贝壳
// 收集最终数据
let result = [];

// 抓取开始
getData(url);

/**
 * 抓取数据请求函数
 * @param {抓取地址} url
 */
function getData(url) {
  https.get(url, res => {
    let data = '';
    res.on('data', function(chunk) {
      data += chunk;
    });
    res.on('end', function() {
      let formatData = filter(data); // 筛选出需要的数据
      result = result.concat(formatData); // 拼接此次抓取到的数据
      page++;
      if (page <= endPage) {
        // 继续抓取下一页
        // 通过分析 url 规律，拼出下一页的 url
        // let tempUrl = 'https://wx.fang.lianjia.com/loupan/pg' + page;//链家
        let tempUrl = 'https://wx.fang.ke.com/loupan/pg' + page; // 贝壳
        getData(tempUrl); // 递归继续抓取
      } else {
        console.log(result);
        fs.writeFile(
          'url.js',
          'let data = ' + JSON.stringify(result),
          err => {
            if (!err) console.log('success~');
          }
        );
        let stamp = new Date().getFullYear() + new Date().getMonth() + new Date().getDay();
        writeData(result, `beikewx2000full-${stamp}.xlsx`); // 写入文件
      }
    });
  });
}

/**
 * 处理抓取到的dom函数
 * @param {dom数据} data
 */
function filter(data) {
  let final = []; // 用来存储本页所有数据信息
  // 将页面源代码转换为$对象
  let $ = cheerio.load(data);
  if (total == 0)
  // 如果没获取过总数，那么获取一次总数
    total = $('.resblock-list-container .resblock-have-find span.value').text();
  // 找到列表外层
  let items = $(
    '.resblock-list-container .resblock-list-wrapper .resblock-list'
  );

  // 遍历处理每一条数据（each是cheerio提供的方法，不可以使用forEach）
  items.each((index, item) => {
    let temp = {}; // 用来存储此条数据的信息
    let price, roomValue, tt;
    let title = $(item)
      .find('a.name')
      .text()
      .replace(/\s/g, '');
    if (
      $(item)
        .find('span.desc')
        .text()
        .indexOf('元/㎡(均价)') >= 0
    ) {
      price = $(item)
        .find('span.number')
        .text();
      tt = $(item)
        .find('div.second')
        .text();
    }    else {
      return final;
    }

    if (
      $(item)
        .find('span')
        .text()
        .indexOf('户型：') >= 0
    ) {
      // 处理几室几厅
      roomValue = $(item)
        .find('span')
        .text();
    } else {
      return final;
    }
    // 过滤万/套的数据方便处理
    let info = $(item)
      .find('a.resblock-location')
      .text()
      .replace(/\s/g, '');
    let address = info;

    temp.name = title;
    temp.value = price;
    temp.total = tt.indexOf('总价') > -1 ? tt.split('总价')[1] : tt;
    temp.address = address;
    temp.room = roomValue.split('建面')[0];
    temp.jianmian = roomValue.split('建面')[1];
    final.push(temp);
  });
  return final;
}

/**
 *
 * @param {要写入的数据} data
 * @param {文件名} fileName
 */
function writeData(data, fileName) {
  var excel = {
    sheets: [{
      header: {
        'name': '名字',
        'value': '价格',
        'total': '总价',
        'address': '地址',
        'room': '几室几厅',
        'jianmian': '建面/描述',
      },
      items: data,
      sheetName: fileName,
    }],
    filepath: fileName,
  };
  jexcel.j2e(excel, function(err) {
    console.log('finish');
  });
}

