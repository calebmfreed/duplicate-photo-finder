import React, { Component } from 'react';
import fs from 'fs';
import crypto from 'crypto';
import { remote } from 'electron';
import getFiles from './FilePaths';

//const Electron = require('electron');

const fileHashes = {};

async function generateHash(filename) {
  const algorithm = 'sha512';

  const hash = crypto.createHash(algorithm);
  const fileStream = fs.ReadStream(filename);

  fileStream.on('data', (data) => {
    hash.update(data);
  });

  const end = new Promise((resolve) => {
    fileStream.on('end', () => {
      const digest = hash.digest('hex');
      resolve(digest);
    });
  });
  return end;
}

function getHashes(folder) {
  if (folder.length > 0) {
    getFiles(folder[0]).then((files) => {
      files.forEach((filePath) => {
        generateHash(filePath).then((hash) => {
          fileHashes[hash] = (fileHashes[hash] || []).concat([filePath]);
        });
      });
      console.log(fileHashes);
    });
  }
}

export default class App extends Component {
  constructor(props) {
    super(props);
    console.log(remote);
    remote.dialog.showOpenDialog({ properties: ['openDirectory'] }, folderPath => getHashes(folderPath));
  }
  render() {
    return (
      <div>
        <h2>Welcome to React!</h2>
      </div>
    );
  }
}

