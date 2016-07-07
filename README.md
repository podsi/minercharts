# minercharts
WebUI for the Data-Miner of SubCat

## Requirements
* [npm](https://www.npmjs.com/)
* [Node.js](http://nodejs.org/)

## Install
* Clone repository & install npm packages
```sh
git clone git@github.com:podsi/minercharts.git
cd minercharts
npm install
```

* Edit main.json to set some configs (port, path to SubCat sqlite db)
Root directory for db path is the repo root directory.
Please DO NOT CHANGE the "defaults" part of the `main.json`
```sh
vim config/main.json
```

```json
{
  "defaults": {
    "partialsDir": "/views/partials",
    "uiSettingsPath": "./config/ui.json"
  },
  "express": {
    "port": 4000
  },
  "db": {
    "path": "./../YOUR_SubCat_DB.db"
  }
}
```

* Start application
```sh
npm start
```
_For debug mode run_
```sh
DEBUG=minercharts:* npm start
```