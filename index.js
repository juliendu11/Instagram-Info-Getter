const EXPLORE_TAG = "https://www.instagram.com/explore/tags/{hashtag}/?__a=1";
const EXPLORE_TAG_MORE ="https://www.instagram.com/explore/tags/{hashtag}/?__a=1&max_id={max_id}";
const SEARCH_ALL_TAGS = "https://www.instagram.com/web/search/topsearch/?context=blended&query={hashtag}&__a=1";
const MEDIA_INFORMATION = "https://www.instagram.com/p/{code}/?__a=1"

const REGEX_HASHTAG = /#\w+/g;

const axios = require('axios');

async function getWithAxios(url){
    const get = await axios({
        method: 'get',
        url: url,
    });
    return get;
}

function getHastagsFromText(caption){
    return caption.match(REGEX_HASHTAG);
}

function getLikesCount(posts){
    let likes =0;

    posts.forEach(post =>{
        likes = likes + post.node.edge_liked_by.count
    })

    return likes;
}

function getCommentsCount(posts){
    let comments =0;

    posts.forEach(post =>{
        comments = comments + post.node.edge_media_to_comment.count
    })

    return comments;
}

function getHashtagsAndCount(hashtagsAndCountList, posts){
    posts.forEach(post =>{
        post.node.edge_media_to_caption.edges.forEach(c=>{
            let hashtags = getHastagsFromText(c.node.text);
            if (hashtags && hashtags.length !=0){
                hashtags.forEach(hashtag =>{
                    if (hashtagsAndCountList.length != 0 && hashtagsAndCountList.some(x=>x.name == hashtag)){
                        hashtagsAndCountList.find(x=>x.name == hashtag).count++;
                    }
                    else{
                        hashtagsAndCountList.push({name:hashtag, count:1});
                    }
                })
            }
        })
    })
    

    return hashtagsAndCountList;
}

async function getMediaUsername(usersList, posts){

    await Promise.all(
        posts.map(async post => {
            if (!post.node || !post.node.shortcode) return;
            let url = MEDIA_INFORMATION.replace('{code}', post.node.shortcode)
            let getMediaInformation = await getWithAxios(url);
            let username = getMediaInformation.data.graphql.shortcode_media.owner.username
            if (!usersList.includes(username)){
                usersList.push(username);
            }
        })
      );

    return usersList
}

async function getHashtagsInformation({hashtag, maxPageToLoad=10, getUsernames=false}){
    const information = {
        totalPosts:0,
        comments:0,
        likes:0,
        hashtags:[],
        users:[],
        pageLoaded:1
    }

    let url = EXPLORE_TAG.replace('{hashtag}', hashtag);
    let exploreTag = await getWithAxios(url);


    let normalPost = exploreTag.data.graphql.hashtag.edge_hashtag_to_media;
    let topPost = exploreTag.data.graphql.hashtag.edge_hashtag_to_top_posts;

    information.totalPosts = normalPost.count;

    information.comments = getCommentsCount(normalPost.edges)
    information.likes = getLikesCount(normalPost.edges)
    information.hashtags = getHashtagsAndCount(information.hashtags,normalPost.edges);
    if (getUsernames){
        information.users = await getMediaUsername(information.users, normalPost.edges)
    }

    information.comments += getCommentsCount(topPost.edges)
    information.likes += getLikesCount(topPost.edges)
    information.hashtags = getHashtagsAndCount(information.hashtags,topPost.edges);
    if (getUsernames){
        information.users = await getMediaUsername(information.users, topPost.edges)
    }


    let hasNextPage =  exploreTag.data.graphql.hashtag.edge_hashtag_to_media.page_info.has_next_page;

    if (hasNextPage === true && maxPageToLoad > information.pageLoaded){
            let endCursor =  exploreTag.data.graphql.hashtag.edge_hashtag_to_media.page_info.end_cursor;
            while (information.pageLoaded != maxPageToLoad && hasNextPage === true) {
                url = EXPLORE_TAG_MORE.replace('{hashtag}', hashtag).replace('{max_id}', endCursor);
                exploreTag = await getWithAxios(url);

                normalPost = exploreTag.data.graphql.hashtag.edge_hashtag_to_media;
                topPost = exploreTag.data.graphql.hashtag.edge_hashtag_to_top_posts;

                information.comments += getCommentsCount(normalPost.edges)
                information.likes += getLikesCount( normalPost.edges)
                information.hashtags = getHashtagsAndCount(information.hashtags,normalPost.edges);
                if (getUsernames){
                    information.users = await getMediaUsername(information.users, normalPost.edges)
                }


                information.comments += getCommentsCount(topPost.edges)
                information.likes += getLikesCount(topPost.edges)
                information.hashtags = getHashtagsAndCount( information.hashtags,topPost.edges);
                if (getUsernames){
                    information.users = await getMediaUsername(information.users, topPost.edges)
                }


                hasNextPage =  exploreTag.data.graphql.hashtag.edge_hashtag_to_media.page_info.has_next_page;
                endCursor =   exploreTag.data.graphql.hashtag.edge_hashtag_to_media.page_info.end_cursor;

                information.pageLoaded ++;
            }
    }


    information.hashtags.sort((a, b) =>{
        return b.count -a.count 
    })

    return information;
}




module.exports = {
    getHashtagsInformation,
    getHastagsFromText,
    getLikesCount,
    getCommentsCount
}
