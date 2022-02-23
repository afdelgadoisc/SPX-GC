
/*  ------------------------------------------ 

  Public API routes for external controllers
  such as Stream Deck or similar.

  /api/v1/

  Home route is a list of available commands.

--------------------------------------------- */

var express = require("express");
const router = express.Router();
const path = require('path');
const fs = require('fs');
const moment = require('moment');
const directoryPath = path.normalize(config.general.dataroot);
const logger = require('../utils/logger');
logger.debug('API-v1 route loading...');
const spx = require('../utils/spx_server_functions.js');
const xlsx = require('node-xlsx').default;
const axios = require('axios')
const PlayoutCCG = require('../utils/playout_casparCG.js');
const { query } = require("../utils/logger");

// ROUTES -------------------------------------------------------------------------------------------
router.get('/', function (req, res) {
  let functionsDoc = {
      "sections" : [

        {
          "section"   :     "Direct commands",
          "info"      :     "Commands which does not require rundown to be loaded",
          "endpoint"  :     "/api/v1/",
          "commands": [
            {
              "param"   :     "invokeTemplateFunction?playserver=OVERLAY&playchannel=1&playlayer=19&webplayout=19&function=myCustomTemplateFunction&params=Hello%20World",
              "info"    :     "GET (v1.0.12) Uses an invoke handler to call a function in a template. See required parameters in the example call above."
            },
            {
              "param"   :     "directplayout",
              "info"    :     "POST (v1.0.12) Populate template and execute a play/continue/stop -command to it. Post request body example here as stringified JSON: {\"casparServer\": \"OVERLAY\",  \"casparChannel\": \"1\",  \"casparLayer\": \"20\",  \"webplayoutLayer\": \"20\", \"relativeTemplatePath\": \"/vendor/pack/template.html\", \"DataFields\": [{field: \"f0\", value: \"Lorem\"},{field: \"f1\", value: \"Ipsum\"}]; \"command\": \"play\"} The casparServer refers to a named CasparCG connection in SPX configuration."
            },
            {
              "param"   :     "controlRundownItemByID?file=HelloWorld-project/My%20first%20rundown&item=1616702200909&command=play",
              "info"    :     "GET (v.1.1.0) Play / stop an item from a known rundown. (Remember you can rename rundown items from SPX GUI)"
            }
          ]
        },
        {
          "section"   :     "Helpers",
          "info"      :     "Utility API calls",
          "endpoint"  :     "/api/v1/",
          "commands": [
            {
              "param"   :     "feedproxy?url=http://corsfeed.net&format=xml",
              "info"    :     "GET (v1.0.14) A proxy endpoint for passing feed data from CORS protected datasources. Implemented for SPX SocialPlayout Extension."
            },
            {
              "param"   :     "panic",
              "info"    :     "GET (v1.1.0) Force clear to all output layers without out-animations. (Note, this does NOT save on-air state of rundown items to false, so when UI is reloaded the items will show the state before panic was triggered.) This is to be used for emergency situations only and not as a normal STOP command substitute."
            }
          ]
        },


        {
          "section"   :     "Rundown commands and navigation",
          "info"      :     "Commands to load playlists, move focus on the opened rundown etc.",
          "endpoint"  :     "/api/v1/rundown/",
          "commands": [
            {
              "param"   :     "load?file=MyFirstProject/MyFirstRundown",
              "info"    :     "GET Open rundown from project / file."
            },
            {
              "param"   :     "focusFirst",
              "info"    :     "GET Move focus to the first item on the rundown."
            },
            {
              "param"   :     "focusNext",
              "info"    :     "GET Move focus down to next item, will not circle back to top when end is reached."
            },
            {
              "param"   :     "focusPrevious",
              "info"    :     "GET Move focus up to previous item, will not circle back to bottom when top is reached."
            },
            {
              "param"   :     "focusLast",
              "info"    :     "GET Move focus to the last item on the rundown."
            },
            {
              "param"   :     "stopAllLayers",
              "info"    :     "GET Animate all layers (used by the current rundown) out, but does not clear layers."
            }

          ]
        },

        {
          "section"   :     "Playback controls",
          "info"      :     "Commands for rundown items. API response is rundown reference, id of rundown item and it's current playout status and server info.",
          "endpoint"  :     "/api/v1/item/",
          "commands": [
            {
              "param"   :     "play",
              "info"    :     "GET Start focused item."
            },
            {
              "param"   :     "play/1234567890",
              "info"    :     "GET Start item by ID on the active rundown."
            },
            {
              "param"   :     "continue",
              "info"    :     "GET Issue continue command to selected item. Notice this needs support from the template itself and does not work as play or stop."
            },
            {
              "param"   :     "continue/1234567890",
              "info"    :     "GET Continue to item by ID on the active rundown. Notice this needs support from the template itself and does not work as play or stop."
            },
            {
              "param"   :     "stop",
              "info"    :     "GET Stop focused item."
            },
            {
              "param"   :     "stop/1234567890",
              "info"    :     "GET Stop item by ID on the active rundown."
            }

          ]
        },

      ]
    }
    res.render('view-api-v1', { layout: false, functionList:functionsDoc });
});


// DIRECT COMMANDS (bypassing rundown) ----------------------------------------------------------
  router.get('/invokeTemplateFunction/', async (req, res) => {

    // function fixedEncodeURIComponent (str) {
    //   return encodeURIComponent(str).replace(/[!'()*]/g, escape); // encode single quote also!
    // }

    // create a data object 
    let dataOut = {};
    dataOut.prepopulated = 'true'
    dataOut.playserver   = req.query.playserver || 'OVERLAY';
    dataOut.playchannel  = req.query.playchannel || '1';
    dataOut.playlayer    = req.query.playlayer || '1';
    dataOut.webplayout   = req.query.webplayout || '1';
    // dataOut.relpath      = 'we_need_some_filename_here_to_prevent_errors.html'
    dataOut.command      = 'invoke';
    dataOut.invoke       = req.query.function + '(\"' + encodeURIComponent(req.query.params) + '\")'; // encode added in v1.1.0
    res.status(200).send('Sent request to SPX server: ' + JSON.stringify(dataOut));
    // console.log('API endpoint for invoke got:', dataOut);
    spx.httpPost(dataOut,'/gc/playout')
  });


  router.post('/directplayout', async (req, res) => {
    let dataOut = {};
    dataOut.playserver   = req.body.casparServer || 'OVERLAY';
    dataOut.playchannel  = req.body.casparChannel || '1';
    dataOut.playlayer    = req.body.casparLayer || '1';
    dataOut.webplayout   = req.body.webplayoutLayer || '1';
    dataOut.prepopulated = 'true';
    dataOut.relpath      = req.body.relativeTemplatePath || '/vendor/pack/template.html';
    dataOut.command      = req.body.command || 'play';
    dataOut.dataformat   = req.body.dataformat || 'xml';
    dataOut.fields       = req.body.DataFields || '{field: f0, value: "Lorem ipsum"}';
    res.status(200).send('Sent request to SPX server: ' + JSON.stringify(dataOut));
    spx.httpPost(dataOut,'/gc/playout')
  });

  router.get('/directplayout', async (req, res) => {
    res.status(404).send('Sorry, this endpoint only available as POST REQUEST with parameters, see the example text or see controlRundownItemByID -endpoint for basic play/stop controls.');
  });


// RUNDOWN COMMANDS -----------------------------------------------------------------------------
    router.get('/rundown/load/', async (req, res) => {
      let file = req.query.file;
      let dataOut = {};
      dataOut.APIcmd  = 'RundownLoad';
      dataOut.file    = file;
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/rundown/focusFirst/', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'RundownFocusFirst';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/rundown/focusNext/', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'RundownFocusNext';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/rundown/focusPrevious/', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'RundownFocusPrevious';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/rundown/focusLast/', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'RundownFocusLast';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/rundown/stopAllLayers', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'RundownStopAll';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

// HELPER COMMANDS ----------------------------------------------------------------------------------

    router.get('/panic', async (req, res) => {
      // This WILL NOT change playlist items onair to "false"!

      // Clear Webplayout ---------------------------
      io.emit('SPXMessage2Client', {spxcmd: 'clearAllLayers'}); // clear webrenderers
      io.emit('SPXMessage2Controller', {APIcmd:'RundownAllStatesToStopped'}); // stop UI and save stopped values to rundown

      // Clear CasparCG -----------------------------
      if (!spx.CCGServersConfigured){ return } // exit early, no need to do any CasparCG work
      PlayoutCCG.clearChannelsFromGCServer(req.body.server) // server is optional
      return res.status(200).json({ message: 'Panic executed. Layers cleared forcefully.' })

    });

    router.get('/feedproxy', async (req, res) => {
      // added in 1.0.14
      axios.get(req.query.url)
      .then(function (response) {
        res.header('Access-Control-Allow-Origin', '*')
        switch (req.query.format) {
          case 'xml':
            res.set('Content-Type', 'application/rss+xml')
            break;

          default:
            res.set('Content-Type', 'application/json')
            break
        }
        res.send(response.data)
      })
      .catch(function (error) {
        console.log(error);
        return res.status(500).json({ type: 'error', message: error.message })
      });
    });


// ITEM COMMANDS ------------------------------------------------------------------------------------
    router.get('/item/play', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'ItemPlay';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/item/play/:id', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'ItemPlayID';
      dataOut.itemID  = req.params.id;
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/item/continue', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'ItemContinue';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/item/continue/:id', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'ItemContinueID';
      dataOut.itemID  = req.params.id;
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/item/stop', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'ItemStop';
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });

    router.get('/item/stop/:id', async (req, res) => {
      let dataOut = {};
      dataOut.APIcmd  = 'ItemStopID';
      dataOut.itemID  = req.params.id;
      io.emit('SPXMessage2Controller', dataOut);
      res.status(200).send('Sent request to controller: ' + JSON.stringify(dataOut));
    });


    router.get('/controlRundownItemByID', async (req, res) => {
      try {
        // added in 1.1.0 and removed obsolete datafile read/write logic
        let fold = req.query.file.split('/')[0];
        let file = req.query.file.split('/')[1];
        let RundownFile = path.join(config.general.dataroot, fold, 'data',  file + '.json');
        let dataOut = {};
        dataOut.datafile      = RundownFile;
        dataOut.epoch         = req.query.item;
        dataOut.command       = req.query.command;
        dataOut.prepopulated  = 'false';
        res.status(200).send('Sent request to SPX server: ' + JSON.stringify(dataOut));
        spx.httpPost(dataOut,'/gc/playout')
      } catch (error) {
        res.status(500).send('Error in /api/v1/controlRundownItemByID: ' + error);
      }

    });


    router.get('/changeItemID', async (req, res) => {
      // Added in 1.0.15 - undocumented intentionally
      // ID button in SPX controller uses this API endpoint:
      // /api/v1/changeItemID?rundownfile=C:/SPX/DATAROOT/PROJECT/data/list.json&ID=0000001&newID=0000002

      try {
        let file = req.query.rundownfile || '';
        let oldI = req.query.ID || '';
        let newI = req.query.newID || '';

        console.log('changeItemID - file [' + file + '], old [' + oldI + '], new [' + newI + ']')

        if (!file || !oldI || !newI) {
          console.warn('Missing data: file [' + file + '], old [' + oldI + '], new [' + newI + ']')
        }

        let datafile = path.normalize(file);
        const RundownData = await spx.GetJsonData(datafile);

        // First check for conflicts
        RundownData.templates.forEach((item,index) => {
          if (item.itemID === newI) {
            logger.verbose('ID not changed')
            throw 'ID conflict'
          }
        });

        RundownData.templates.forEach((item,index) => {
          if (item.itemID === oldI) {
            item.itemID = newI
          }
        });

        RundownData.updated = new Date().toISOString();
        global.rundownData = RundownData; // push to memory also for next take
        await spx.writeFile(datafile,RundownData);
        // await spx.writeFile(RundownData.filepath,RundownData);
        // console.log('Saved');
        logger.verbose('Changed item ID to ' + newI);
        return res.status(200).send('ID changed to ' + newI);
      } catch (error) {
        console.log('Error', error);
        logger.error('changeItemID error', error)  ;
        return res.status(409).send('ID not changed');
      }
});


module.exports = router;