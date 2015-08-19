# tagplay-text

A text processing helper lib for Tagplay.

This library was made to correctly link and process Tagplay posts, but can be used separately.

It heavily makes use of Twitter's [twitter-text](https://github.com/twitter/twitter-text) library.

## Installation

    npm install tagplay-text

## Usage

    var tagplaytext = require('tagplay-text');

    ...

    var postHTML = tagplaytext.htmlize(post.text, post.provider.name, post.links, true, true);

## API

This API should be considered unstable for the moment; before a 1.0.0 version is released, there may be backwards-incompatible changes in minor versions.

### tagplaytext.htmlize(text, provider, links, strippedTags, normalize)

The "main" function of the library, which returns an HTML representation of the provided text with links, hashtags and mentions handled appropriately. Takes five arguments:

- `text`: The text that should be HTMLized.
- `provider`: The service that hashtags/mentions should link to. Currently, tagplay-text only supports linking hashtags and mentions for Instagram and Twitter (`instagram`/`twitter`); for any other value, hashtags and mentions will not be linked.
- `links`: An array of link entities as returned by Tagplay's API. If this is `undefined`, any URLs within the text will be automatically linked. Otherwise, each link entity has the following properties:
  - `href`: The URL to be linked to.
  - `text`: The text of the link.
  - `description` (optional): A description that should be included in the title attribute of the link. Defaults to the full URL.
  - `index`: An array of two integers representing the start and end indices of the link within the provided `text`. Note that these are proper Unicode indices, which are not necessarily equivalent to Javascript string indices.
- `strippedTags`: Controls whether "trailing hashtags" should be stripped out of the result. "Trailing hashtags" are defined to be any valid hashtags appearing at the *end* of the provided `text`, followed and separated only by whitespace. If `strippedTags` is `true`, all such trailing hashtags will be stripped out; if `strippedTags` is an array, then any hashtags that appear in the provided array will be removed from the trailing hashtags.
- `normalize`: A boolean indicating whether or not hashtags should be "normalized" by removing the leading #. This is useful when processing posts that include hashtagged words within them, e.g. "#Tagplay is awesome". With `normalize` set to `true`, this post will be shown simply as "Tagplay is awesome", and "Tagplay" will not be linked to search results for the #Tagplay hashtag on the relevant social network.

### tagplaytext.linkLinks(text, links, htmlEscape)

Returns a copy of `text` with the link entities given in `links` properly HTML-linkified within the text. Takes three arguments:

- `text`: The text that should be linkified.
- `links`: An array of link entities as returned by Tagplay's API, as described under the description of `htmlize()`. If this is `undefined, any URLs within the text will be automatically linked instead.
- `htmlEscape`: A boolean indicating whether the rest of the text should be HTML-escaped in the process.

### tagplaytext.linkHashtagsAndMentions(text, provider, htmlEscape)

Returns a copy of `text` with any hashtags and @mentions converted into HTML links to the appropriate pages on the given `provider` site. Takes three arguments:

- `text`: The text that should be linkified.
- `provider`: The lowercase name of a site or service that the post comes from. For supported services (currently, only `twitter` and `instagram`), the post's hashtags and mentions will be hyperlinked to a page on that service with posts for that hashtag/user.
- `htmlEscape`: A boolean indicating whether the rest of the text should be HTML-escaped in the process.

### tagplaytext.stripTrailingHashtags(text, strippedTags)

Returns a copy of `text` with trailing hashtags stripped as specified by the `strippedTags` argument. Takes two arguments:

- `text`: The text to be stripped.
- `strippedTags`: If not provided or `true`, all trailing hashtags will be stripped away. If this is an array, only the given hashtags will be stripped out if they appear in the trailing tags.

### tagplaytext.normalizeHashtags(text)

Returns a copy of `text` with the # symbol removed from all hashtags found in it. Takes one argument:

- `text`: The text to be normalized.