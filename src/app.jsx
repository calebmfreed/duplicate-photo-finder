import React, { Component } from 'react';
import fs from 'fs';
import crypto from 'crypto';
import { remote } from 'electron';
import getFiles from './FilePaths';

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

async function getAllFilesInFolders(folders) {
  const promises = folders.map(getFiles);
  const files = await Promise.all(promises);
  return files.reduce((accumulator, currentValue) => accumulator.concat(currentValue));
}

// One file at a time, takes a long time, somewhat preferred to maintain file order
async function getHashesForFiles(files) {
  const fileHashes = {};
  /*eslint-disable */
  for (const filePath of files) {
    const hash = await generateHash(filePath);
  /*eslint-enable */
    fileHashes[hash] = (fileHashes[hash] || []).concat([filePath]);
  }
  return fileHashes;
}

async function getHashesForFilesParallel(files) {
  const fileHashes = {};
  const promises = [];
  files.forEach((filePath) => {
    const promise = generateHash(filePath).then((hash) => {
      fileHashes[hash] = (fileHashes[hash] || []).concat([filePath]);
    });
    promises.push(promise);
  });
  await Promise.all(promises);
  return fileHashes;
}

async function getHashes(folders) {
  const allFiles = await getAllFilesInFolders(folders);
  console.log('Done with the folder loop', allFiles);
  const fileHashes = await getHashesForFiles(allFiles);

  return fileHashes;
}

function getDuplicateHashes(fileHashes) {
  return Object.entries(fileHashes).filter(([key, value]) => value.length > 1);
}

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = { hashes: {}, duplicateHashes: [] };
    this.handleFolderSelection = this.handleFolderSelection.bind(this);
  }

  async handleFolderSelection(folderPath) {
    if (folderPath) {
      const hashes = await getHashes(folderPath);
      const duplicateHashes = getDuplicateHashes(hashes);
      console.log(duplicateHashes);
      this.setState({ hashes, duplicateHashes });
    }
  }

  selectRowToDisplay([key, value]) {
    this.setState({ display: value });
  }

  render() {
    return (
      <div>
        <h2>Find Duplicate Photos</h2>
        <button onClick={() => { remote.dialog.showOpenDialog({ properties: ['openDirectory', 'multiSelections'] }, folderPath => this.handleFolderSelection(folderPath)); }} >Select Folder</button>
        <div style={{ overflow: 'scroll' }}>
          <div style={{ display: 'flex', flexWrap: 'nowrap', justifyContent: 'space-between', minHeight: '30rem', maxHeight: '50rem' }}>
            {
              this.state.display && this.state.display.map(imgPath =>
                (
                  <img style={{ maxWidth: '49%', height: 'auto', alignSelf: 'center', maxHeight: '50rem' }} key={imgPath} src={`file://${imgPath}`} />
              ))
            }
          </div>
          <div style={{ height: '30rem', overflow: 'scroll' }}>
            <table style={{ display: 'block' }}>
              <thead style={{ display: 'block' }}>
                <tr>
                  <th>File Hash</th>
                  <th>File Paths</th>
                </tr>
              </thead>
              <tbody style={{ display: 'block' }}>
                {
                  this.state.duplicateHashes.map(
                  ([key, value]) => (<tr onClick={() => this.selectRowToDisplay([key, value])} key={key}><td>{key.substring(0, 6)}</td><td>{value}</td></tr>))
                }

              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}

