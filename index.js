'use strict';

var twttrtxt = require('twitter-text');

var trailingHashtagRegex = twttrtxt.regexSupplant(/\s*#{validHashtag}\s*$/i);

module.exports = {
  normalizeHashtags: normalizeHashtags,
  stripTrailingHashtags: stripTrailingHashtags,
  linkLinks: linkLinks,
  linkHashtagsAndMentions: linkHashtagsAndMentions,
  htmlize: htmlize
};

function normalizeHashtags (text) {
  return text.replace(twttrtxt.regexen.validHashtag, function (match, before, hash, hashText, offset, chunk) {
    return before + hashText;
  });
}

function _getTrailingHashtagsIndex (text) {
  // We used to do this with a single regex, but catastrophic backtracking happened. Let's just loop through any trailing hashtags one at a time.
  var trailingTagsStart = text.length;
  var match;
  while (match !== null) {
    match = trailingHashtagRegex.exec(text.substring(0, trailingTagsStart));
    if (!match[1] || match[1].match(/^\s+$/)) {
      trailingTagsStart = match.index;
    } else {
      trailingTagsStart = match.index + 1;
    }
  }
  return trailingTagsStart;
}

function stripTrailingHashtags (text, strippedTags) {
  var trailingTagsStart = _getTrailingHashtagsIndex(text);

  if (trailingTagsStart === text.length) {
    // There are no trailing tags - leave the text untouched
    return text;
  }

  if (typeof strippedTags === 'undefined' || strippedTags === true) {
    // We should strip out all trailing tags
    return text.substring(0, trailingTagsStart);
  } else if (Object.prototype.toString.call(strippedTags) === '[object Array]') {
    return text.substring(0, trailingTagsStart) + text.substring(trailingTagsStart).replace(twttrtxt.regexen.validHashtag, function (match, before, hash, hashText, offset, chunk) {
      for (var i = 0; i < strippedTags.length; i++) {
        if (strippedTags[i].toLowerCase() === hashText.toLowerCase()) {
          if (before.match(/^\s+$/)) {
            // If before is just whitespace, we can remove it
            return '';
          } else {
            // Otherwise, return before but not the hashtag
            return before;
          }
        }
      }
      // This tag shouldn't be stripped - just return the entire match
      return match;
    });
  } else {
    console.error('Invalid strippedTags parameter.');
    return text;
  }
}

function linkLinks (text, links, htmlEscape) {
  var options = {
    htmlEscapeNonEntities: htmlEscape,
    target: '_blank'
  };

  if (typeof links === 'undefined') {
    // Just auto-link
    return twttrtxt.autoLinkUrlsCustom(text, options);
  } else if (Object.prototype.toString.call(links) === '[object Array]') {
    return twttrtxt.autoLinkEntities(text, links.map(function (link) {
      return { url: link.href, display_url: link.text, expanded_url: link.description || link.href, indices: link.index };
    }), options);
  } else {
    console.error('Invalid links parameter.');
    if (htmlEscape) {
      return twttrtxt.htmlEscape(text);
    } else {
      return text;
    }
  }
}

function linkHashtagsAndMentions (text, provider, htmlEscape) {
  var options = {
    htmlEscapeNonEntities: htmlEscape,
    hashtagClass: 'tagplay-hashtag',
    usernameClass: 'tagplay-mention',
    target: '_blank',
    usernameIncludeSymbol: true
  };
  if (provider === 'instagram') {
    options.hashtagUrlBase = 'https://instagram.com/explore/tags/';
    options.usernameUrlBase = 'https://instagram.com/';
  } else if (provider === 'twitter') {
    options.hashtagUrlBase = 'https://twitter.com/hashtag/';
    options.usernameUrlBase = 'https://twitter.com/';
  } else {
    // Unrecognized provider - just return the text
    if (htmlEscape) {
      return twttrtxt.htmlEscape(text);
    } else {
      return text;
    }
  }

  var mentionEntities = twttrtxt.extractMentionsWithIndices(text);
  var hashtagEntities = twttrtxt.extractHashtagsWithIndices(text);

  return twttrtxt.autoLinkEntities(text, mentionEntities.concat(hashtagEntities), options);
}

function htmlize (text, provider, links, strippedTags, normalize) {
  var result = linkLinks(text, links, true);

  if (strippedTags === true) {
    // Strip all tags
    result = stripTrailingHashtags(result);
  } else if (Object.prototype.toString.call(strippedTags) === '[object Array]') {
    // Strip the given tags
    result = stripTrailingHashtags(result, strippedTags);
  }

  if (normalize) {
    result = normalizeHashtags(result);
  }

  result = linkHashtagsAndMentions(result, provider);

  return result.replace(/\n/g, '<br>');
}
