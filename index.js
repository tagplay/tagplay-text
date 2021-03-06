'use strict';

var twttrtxt = require('twitter-text');
var commonmark = require('commonmark');

var trailingHashtagRegex = twttrtxt.regexSupplant(/\s*#{validHashtag}\s*$/i);

module.exports = {
  normalizeHashtags: normalizeHashtags,
  stripTrailingHashtags: stripTrailingHashtags,
  linkLinks: linkLinks,
  linkHashtagsAndMentions: linkHashtagsAndMentions,
  htmlize: htmlize
};

function getHashtagUrlBase (provider) {
  var providerMap = {
    instagram: 'https://instagram.com/explore/tags/',
    twitter: 'https://twitter.com/hashtag/',
    facebook: 'https://www.facebook.com/hashtag/'
  };
  return providerMap[provider];
}

function getUsernameUrlBase (provider) {
  var providerMap = {
    instagram: 'https://instagram.com/',
    twitter: 'https://twitter.com/'
  };
  return providerMap[provider];
}

function normalizeHashtags (text) {
  return text.replace(twttrtxt.regexen.validHashtag, function (match, before, hash, hashText, offset, chunk) {
    return before + hashText;
  });
}

function _getTrailingHashtagsIndex (text) {
  // We used to do this with a single regex, but catastrophic backtracking happened. Let's just loop through any trailing hashtags one at a time.
  var trailingTagsStart = text.length;
  var match = trailingHashtagRegex.exec(text);
  while (match !== null) {
    if (!match[1] || match[1].match(/^\s+$/)) {
      trailingTagsStart = match.index;
    } else {
      trailingTagsStart = match.index + 1;
    }
    match = trailingHashtagRegex.exec(text.substring(0, trailingTagsStart));
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
    usernameIncludeSymbol: true,
    hashtagUrlBase: getHashtagUrlBase(provider),
    usernameUrlBase: getUsernameUrlBase(provider)
  };

  var entities = [];

  if (options.hashtagUrlBase) {
    entities.push.apply(entities, twttrtxt.extractHashtagsWithIndices(text));
  }
  if (options.usernameUrlBase) {
    entities.push.apply(entities, twttrtxt.extractMentionsWithIndices(text));
  }

  return twttrtxt.autoLinkEntities(text, entities, options);
}

function htmlize (text, options) {
  if (!options) options = {};
  var result = text;
  if (options.formatting !== 'markdown') {
    result = linkLinks(result, options.links, true);
  }

  if (options.strippedTags === true) {
    // Strip all tags
    result = stripTrailingHashtags(result);
  } else if (Object.prototype.toString.call(options.strippedTags) === '[object Array]') {
    // Strip the given tags
    result = stripTrailingHashtags(result, options.strippedTags);
  }

  if (options.normalize) {
    result = normalizeHashtags(result);
  }

  if (options.formatting === 'markdown') {
    var parser = new commonmark.Parser();
    var renderer = new commonmark.HtmlRenderer({ softbreak: '<br>', safe: true });
    // Add target="_blank" to links
    renderer.attrs = function (node) {
      var attrs = commonmark.HtmlRenderer.prototype.attrs.call(renderer, node);
      if (node.type === 'link') {
        attrs.push(['target', '_blank']);
      }
      return attrs;
    };
    // Process links/hashtags/mentions in text (but not in code etc.)
    // linkLinks handles HTML-escaping.
    renderer.text = function (node) {
      this.lit(linkHashtagsAndMentions(linkLinks(node.literal, undefined, true), options.provider));
    };

    var parsed = parser.parse(result);
    return renderer.render(parsed);
  } else {
    result = linkHashtagsAndMentions(result, options.provider);
    if (options.paragraphs) {
      var paragraphs = result.split(/\n\n+/);
      var formatted = [];
      for (var i = 0; i < paragraphs.length; i++) {
        formatted.push('<p>' + paragraphs[i].replace(/\n/g, '<br>') + '</p>');
      }
      return formatted.join('');
    } else {
      return result.replace(/\n/g, '<br>');
    }
  }
}
