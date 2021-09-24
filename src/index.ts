import http, { IncomingMessage } from 'http';
import fs from 'fs';
import path from 'path';

interface IPost {
  userId: number;
  id: string;
  title: string;
  body: string;
}

let postsListGlobal: string;

const options = {
  host: 'jsonplaceholder.typicode.com',
  path: '/posts',
  method: 'GET'
};

const getPostsCallback = (response: IncomingMessage) => {
  let entireResponse = '';

  response.on('data', (chunk) => {
    entireResponse += chunk;
  });

  response.on('end', () => {
    postsListGlobal = entireResponse as any;
  })
}

const getPosts = http.request(options, getPostsCallback);

http.createServer((req, res) => {
  getPosts.end(() => {
    if (req.url.includes('.ico') || req.url.includes('.js')) {
      res.end();
      return
    }

    const filePath = path.join(__dirname, 'components', req.url.split('.')[0], `${req.url.includes('.') ? req.url : req.url + '.html'}`);

    if (postsListGlobal) {
      const posts: IPost[] = JSON.parse(postsListGlobal);

      render(filePath, res, { posts, name: 'Name', middleMessage: 'This is middle message', footerMessage: 'This is footer message' });
    }
  })
}).listen(4000, () => console.log('server running'))

const matchedFor = / *for="let \w+ of \w+"/g;
const matchForIntervalTags = /( *)<(\w+) for="let \w+ of \w+">(\s|.)+<\/\2>/gm;
const matchedContentInsideFor = /( *)<(\w+)(?!(\s|.)for=")>(\s|.)*?<\/\2>/gm;

function render(filePath, res, bindings) {
  fs.readFile(filePath, (err, file) => {
    let fileString = file.toString();

    if (fileString.match(matchedFor)) {
      const allForIntervalTags = fileString.match(matchForIntervalTags);
      const listOfHtmlTags = [];

      allForIntervalTags.forEach(forLoop => {
        const forLoopCache = forLoop;
        const matchedForLoop = (forLoop.match(matchedFor))[0];
        const matchedForContent = forLoop.match(matchedContentInsideFor).join('');

        forLoop = forLoop.replace(matchedFor, '');

        const matchedForSplit = matchedForLoop.split(/ /);
        const matchedBinding = matchedForSplit[matchedForSplit.length - 1].replace(/"/, '');
        const matchedKeyOfIterator = matchedForSplit[2];

        const matchedInnerValue = new RegExp(`(?<=${matchedKeyOfIterator}.)\\w+`, 'gm');

        let replacedString = '';

        if (bindings[matchedBinding]) {
          bindings[matchedBinding].forEach(bindingValue => {
            if (!matchedForContent.match(matchedInnerValue)) return;
            matchedForContent.match(matchedInnerValue).forEach(value => {
              const matchedValueToReplace = new RegExp(`{{ ${matchedKeyOfIterator}.${value} }}`);
              const replaceValueIn = replacedString.length > 0 ? replacedString : matchedForContent;

              replacedString = replaceValueIn.replace(matchedValueToReplace, bindingValue[value]);
            });

            listOfHtmlTags.push(replacedString);
            replacedString = '';
          });

          fileString = fileString.replace(forLoopCache, listOfHtmlTags.join(''))
        }
      });

      const keys = Object.keys(bindings);
      keys.forEach(key => {
        const matchedKeys = fileString.match(new RegExp(`{{ ${key} }}`, 'g'));

        if (matchedKeys && matchedKeys.length) {
          matchedKeys.forEach(matchedKey => {
            fileString = fileString.replace(matchedKey, bindings[key]);
          })
        }
      });
    }
    res.write(fileString);

    res.end();
  });
}