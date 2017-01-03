$(document).ready(function($) {
  console.log("hello world")
  var idArray =[]
  chrome.browserAction.setBadgeText({text: "10+"});
  // var itemList=[];
  // var stor=[];
  // chrome.storage.local.set({'IDs': stor});
  
  getStoredIDs();
  
  $('#add-btn').click( function() {
    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
      var url = tabs[0].url;
      console.log(url);

      // Return if not on an ebay site
      if(!(url.indexOf("ebay") > -1)) {
       console.log("your url doesnt contain ebay");
       return
      }
      // turn into id
      var id = url2id(url);
      console.log(id);


      // return if we've already saved this site
      if (idArray.indexOf(id) > -1) {
        console.log("youve already saved this auction")
        return
      }  
      // if this is the first auction in the list, replace filler
      if (idArray[0]=="this is empty"){
        idArray[0]=id;
      }
      else{
        idArray.push(id);
      }
      console.log(idArray);
      chrome.storage.local.set({'IDs': idArray});
      UpdateAuctionList();
    });
  });

  function url2id(url) {
    delim1= '/';
    nr=5;
    delim2='?'
    for (i = 0; i < nr; i++){
      var cutoff = url.indexOf(delim1);
      url=url.slice(cutoff+1)
    }
    cutoff=url.indexOf(delim2);
    if (cutoff!=-1){
      url=url.slice(0, cutoff- url.length);
    }
    return(url);
  }

  function UpdateAuctionList(params) {
    $('#watch-list').empty();

    // for(var i = 0; i < idArray.length; i++) {
    //   var el = document.createElement("list-el");
    //   var opt = idArray[i];
    //   el.textContent = opt;
    //   el.value = opt;
    //   $('#auction-list').append(el);
    // }
    console.log(idArray);
    for (i = 0; i < idArray.length; i++) {
      
        MakeRequest(idArray[i]);    
    }
  }
  function MakeListEl(item) {
    var el = $("<div>", {"class": "item"});
    var imgBox = $("<div>", {"class": "img-box"});
    var itemImg = $("<img>", {"class": "image", "src": item.PictureURL});
    $(imgBox).append(itemImg);
    var name = $("<a>", {
      "class": "name",
      "href": item.normalurl,
      text: item.Title.length > 40 ? item.Title.slice(0,40) : item.Title
    });
    var price = $("<div>", {
      "class": "price",
      text: item.CurrentPrice.Value + ' ' + item.CurrentPrice.CurrencyID
    });
    var endTime = $("<div>", {
      "class": "end",
      text: item.EndTime
    });
    var trash = $("<i>", {
      "class": "fa fa-trash del-btn",
      "aria-hidden": "true",
      "data-id": "item.id"
    });
    $(el).append(imgBox);
    $(el).append(name);
    $(el).append(price);
    $(el).append(endTime);
    $(el).append(trash);
    $('#watch-list').append(el);
  }

  $(document).on('click', "i.del-btn", function() {
      var id = this.getAttribute('data-id');
      delItem(id);
  });

  function delItem(delid) {
    idArray = idArray.splice( $.inArray(idArray, delid), 1 );
    chrome.storage.local.set({'IDs': idArray});
    UpdateAuctionList();
  }

  function getStoredIDs() {
    chrome.storage.local.get('IDs', function(result){
      console.log("res",result);
      idArray = result.IDs; 
      console.log(idArray);
      if (idArray.length>0){
        UpdateAuctionList();
      }
    });  
  }

  function Timestamp2Date(timestamp) {
    var yr = parseInt(timestamp.slice(0, 4));
    var mo = parseInt(timestamp.slice(5, 7));
    var day = parseInt(timestamp.slice(8, 10));
    var h = parseInt(timestamp.slice(11,13));
    var m = parseInt(timestamp.slice(14,16));
    console.log(mo);
    var s = parseInt(timestamp.slice(17,19));
    var tsget = new Date(yr, mo-1, day, h, m, s, 0);
    console.log(tsget.toDateString())
    var userOffset = tsget.getTimezoneOffset()* 60000;
    // 60000 ms in a minute
    var endDate = new Date(tsget.getTime()-(userOffset))
    console.log(endDate.toDateString())
    return endDate;
  }

  function timeHandler(d) {
    endD = Timestamp2Date(d);
    var tsEnd = endD.getTime();
    var nowD = new Date();
    var tsNow = nowD.getTime();
    if(tsEnd<tsNow){
      //delete me
      return 0;
    }
    if (tsEnd-tsNow < 60000*60){
      // if there are only mins left
      var timeLeft = Math.floor((tsEnd-tsNow)/60000);
      var dStr = timeLeft.toString().concat(" Min");
      return dStr;
    }
    else if(tsEnd-tsNow < 60000*60*10){
      var timeLeft = Math.floor((tsEnd-tsNow)/60000/60);
      var dStr = timeLeft.toString().concat(" Hrs");
      return dStr;
    }
    else{
      var dStr = endD.toString();
      return dStr;
    }
  }

  function MakeRequest(itemid) {
    var appid = "LisaSchw-WatcherC-PRD-b45f0c74d-91afa96c";
    // itemid="201672913004";
    var eBayShoppingApiEndPoint = "http://open.api.ebay.com/shopping?"
    var requestParams = {
      "callname": "GetSingleItem",
      "responseencoding": "JSON",
      "appid": appid,
      "siteid": "0",
      "version": 967,
      "ItemID": itemid,
      "IncludeSelector": "Details"
    };
    var requesturl = eBayShoppingApiEndPoint + $.param(requestParams);
    var promise = $.getJSON(requesturl);

    promise.done(function( data ) {
      console.log(data);
      // Handle time 
      var t = data.Item.EndTime;
      var tStr= timeHandler(t)
      if (tStr == 0){
        delItem(itemid);
        return
      }
      item = {
        'EndTime': tStr,
        'PictureURL': data.Item.PictureURL,
        'BidCount': data.Item.BidCount,
        'CurrentPrice': data.Item.CurrentPrice,
        'normalurl': data.Item.ViewItemURLForNaturalSearch,
        'Title': data.Item.Title,
        'id': itemid
      }
      console.log(item);
      // itemList.push(item);
      MakeListEl(item);
    });
    promise.fail(function(){
      alert('Failed call to Ebay API :(');
    })
  }

});