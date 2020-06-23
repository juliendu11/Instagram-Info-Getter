const instagramInfoGetter = require('./index');

(async ()  =>{
    console.log(await instagramInfoGetter.getHashtagsInformation({hashtag:'techno', maxPageToLoad:4}))
})()
