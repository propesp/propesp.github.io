/**
  * PROPESP Reader
  * @file Main functions and animations
  * @author Victor Ribeiro <devjvribeiro@gmail.com>
  * @version 1.0.6
  * @copyright Victor Ribeiro 2018
  * @license MIT
  * @requires assets/libs/clusterize/clusterize.min.js
  * @requires assets/libs/cryptojs/crypto-aes.min.js
  * @requires assets/libs/instascan/instascan.compressed.js
  * @requires assets/libs/jquery/jquery.min.js
  * @requires assets/libs/materialize/js/materialize.min.js
  * @todo Documentate this
  * */
/* jshint esversion: 6 */

// instascan scanner object
scanner = {};

//const protocol = 'http';
//const host = 'seminariopibic.ufpa.br';

let logIsEnabled, snapTimeout, toastTimeout, cameraGlobal, actualLiArr, actualScrollEl, actualContentEl;

let isCameraTabActive = true;

let saved_li_arr = [];
let rejected_li_arr = [];
let syncArr = [];

const _cza='\x74\x69\x32';
const _cyb='\x73\x70';
const _cxb='\x72\x6f';
const _cx='\x70'+_cxb;
const _cz=_cza+'\x30\x31';
const _cy='\x70\x65'+_cyb;
const _k=_cx+_cy+_cz+'\x33';

let qrScan = {
  data: [], // qrScan.data
  rejected: [], // qrScan.rejected

  // DOM
  LOADING: document.querySelector('.pp-scanner--status__loading'), // qrScan.LOADING

  // Sort the array numerically
  sortNumber: (a, b) => { // qrScan.sortNumber(a, b);
    return a - b;
  },

  // HTML element
  initHtmlElement: function (id) { // qrScan.initHtmlElement(id);
    return document.getElementById(id);
  },

  // init video object options
  initVideoObjectOptions: function (id) { // qrScan.initVideoObjectOptions(id);
    scanner = {};

    return {
      video: qrScan.initHtmlElement(id),
      continuous: true,
      mirror: false,
      captureImage: false,
      backgroundScan: false,
      // The period, in milliseconds, before the same QR code will be recognized in succession.
      refractoryPeriod: 4000,
      // Only applies to continuous mode. The period, in rendered frames, between scans. A lower scan period
      // increases CPU usage but makes scan response faster. Default 1 (i.e. analyze every frame).
      scanPeriod: 5
    };
  },

  // init Avaliable Cameras of current device
  initAvaliableCameras: (callBack) => { // qrScan.initAvaliableCameras(callBack);
    Instascan.Camera.getCameras().then(function (cameras) {
      callBack();
    });
  },

  // Init camera
  initCamera: (i) => { // qrScan.initCamera(i);
    scanner.stop();

    Instascan.Camera.getCameras().then(function (cameras) {
      if (cameras.length > 0) {
        let selectedCam = cameras[0];

        $.each(cameras, (i, c) => {
          if (c.name.indexOf('back') !== -1) {
            selectedCam = c;
            return false;
          }
        });

        // console.log(selectedCam);
        // qrScan.log('Camera: ' + JSON.stringify(selectedCam));

        scanner.start(selectedCam);
        cameraGlobal = selectedCam;
      }
      else {
        alert('Nenhuma camera encontrada.');
      }
    });
  },

  scanStart: (ondetect) => { // qrScan.scanStart(ondetect);
    // Emitted when a QR code is scanned using the camera in continuous mode (see scanner.continuous).
    scanner.addListener('scan', function (content) {
      ondetect(content);
    });
  },

  saveScannedData: (data) => { // qrScan.saveScannedData(data);
    let read, proc, qrPretest, act, enc, dec, isQRValid, isMaybeValid, isMaybeEncoded, isEncoded;

    // console.log('QR Code content: ' + data);
    // console.log('Analysing...');

    // Pretest
    // console.log('Executing pretest...');
    if (data.match(/(\n|\s|\{|\()/g) === null) {
      isMaybeValid = true;
    }
    else {
      isMaybeValid = false;
    }

    // Validation
    // Check encoding
    if (isMaybeValid) {
      // console.log('QR Code is maybe valid. Checking encoding...');

      dec = CryptoJS.AES.decrypt(data, _k);
      full_dec = dec.toString(CryptoJS.enc.Utf8);

      // console.log(full_dec);

      if (data !== '' && full_dec === '') {
        isEncoded = false;
      }
      else {
        isEncoded = full_dec.match(/^\{(.*)\}/g) !== null ? true : false;
      }

      // Check if QR is encoded
      if (isEncoded) {
        // console.log('QR Code is encoded! Checking authenticity...');

        isQRValid = full_dec.match(/^\x7b\"\x70\x72\x6f\x70\x65\x73\x70\"\:\x7b(.*)\x7d\x7d/g) !== null ? true : false;
      }
      else {
        // QR is not encoded
        // console.log('QR Code is not encoded!');
        // console.log('QR Code is invalid!');

        isQRValid = false;
      }
    }

    // Check if QR is valid
    if (isQRValid) {
      // console.log('QR Code is valid!');
      // console.log('QR full_dec: ' + full_dec);

      // Animation
      qrScan.animate._snap();
      qrScan.animate._success();

      qrScan.data.push(JSON.parse(full_dec));

      // Actual string Array
      act = JSON.stringify(qrScan.data);
      // console.log('Dados salvos em RAM: ' + act);

      // Encrypted data
      enc =  CryptoJS.AES.encrypt(act, _k);
      // console.log('Dados codificados: ' + enc);

      qrScan.dataRaw = enc.toString();

      localStorage.setItem('data', enc);
      qrScan.animate._showToast('Dados salvos!', 2000);

      qrScan.updateHTMLArray('data');

      qrScan.updateCluster(saved_li_arr);
    }
    // Is invalid
    else {
      // console.log('QR Code is invalid!');
      // Animation
      qrScan.animate._snap();
      qrScan.animate._error();

      qrScan.rejected.push(data);

      // console.log('Dados rejeitados: ' + data);

      // Actual string Array
      act = JSON.stringify(qrScan.rejected);
      // console.log('Dados rejeitados salvos em RAM: ' + act);

      // Encrypt data
      enc = CryptoJS.AES.encrypt(act, _k);
      // console.log('Dados rejeitados codificados: ' + enc);

      qrScan.rejectedRaw = enc.toString();

      localStorage.setItem('rejected', enc);
      qrScan.animate._showToast('QR Code inválido!', 2000);

      qrScan.updateHTMLArray('rejected');

      qrScan.updateCluster(rejected_li_arr);
    }
  },

  loadFromLS: (string) => {
    if (string === 'data') {
      let dataRaw = localStorage.getItem(string);
      // Decrypt data
      let decData = CryptoJS.AES.decrypt(dataRaw, _k);

      let decString = decData.toString(CryptoJS.enc.Utf8);

      qrScan.data = dataRaw === null ? qrScan.data : JSON.parse(decString);
      qrScan.dataRaw = dataRaw;
    }

    if (string === 'rejected') {
      let rejectedRaw = localStorage.getItem(string);
      // Decrypted data
      let decRej = CryptoJS.AES.decrypt(rejectedRaw, _k);

      let decRejString = decRej.toString(CryptoJS.enc.Utf8);

      // console.log('Dados rejeitados decodificados: ' + decRejString);

      qrScan.rejected = localStorage.getItem('rejected') === null ? qrScan.rejected : JSON.parse(decRejString);
      qrScan.rejectedRaw = rejectedRaw;
    }
  },

  updateHTMLArray: (string) => { // qrScan.updateHTMLArray('data'|'rejected'|undefined);
    let now = new Date();

    if (string === 'data' || string === undefined) {
      saved_li_arr = [];

      let data_arr_len = qrScan.data.length;

      for (let i = 0; i < data_arr_len; i++) {
        saved_li_arr.push(
          '<li class="collection-item avatar  valign-wrapper" data-id="' + qrScan.data[i][x].id + '">' +
            //'<i class="material-icons circle">cloud_off</i>' +
            '<i class="material-icons circle green">done</i>' +
            '<span class="title">' + qrScan.data[i][x].nome + '</span>' +
          '</li>'
        );
      }
    }

    if (string === 'rejected' || string === undefined) {
      rejected_li_arr = [];

      let rejected_arr_len = qrScan.rejected.length;

      for (let i = 0; i < rejected_arr_len; i++) {
        rejected_li_arr.push(
          '<li class="collection-item avatar">' +
            '<i class="material-icons circle">close</i>' +
            '<span class="title">' + qrScan.rejected[i] + '</span>' +
          '</li>'
        );
      }
    }
  },

  reload: () => { // qrScan.reload();
    document.location.reload();
  },

  clearSaved: () => { // qrScan.clearSaved();
    localStorage.removeItem('data');
    qrScan.data = [];
    saved_li_arr = [];

    qrScan.updateHTMLArray('data');
    qrScan.updateCluster(saved_li_arr);

    qrScan.animate._showToast('Lista de dados salvos apagada!', 2000);
  },

  clearRejected: () => { // qrScan.clearRejected();
    localStorage.removeItem('rejected');
    qrScan.rejected = [];
    rejected_li_arr = [];

    qrScan.updateHTMLArray('rejected');
    qrScan.updateCluster(rejected_li_arr);

    qrScan.animate._showToast('Lista de rejeitados apagada!', 2000);
  },

  saveToFile: (content, fileName, contentType) => { // qrScan.saveToFile(content, fileName, contentType);
    let a = document.createElement("a");
    let file = new Blob([content], {type: contentType});

    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
  },

  saveJSON: () => {
    let now = new Date();
    let d = now.getDate();
    let m = now.getMonth() + 1;
    let y = now.getFullYear();
    let h = now.getHours();
    let mi = now.getMinutes();

    qrScan.saveToFile(qrScan.dataRaw, 'propespqr-' + '-' + d + '-' + m + '-' + y + '-' + h + '-' + mi + '.p', 'text/plain');
  },

  // create an instance of Instascan QrCode scanner
  initScanner: (options) => { // qrScan.initScanner(options);
    scanner = new Instascan.Scanner(options);
  },

  /* Animations */
  animate: {
    _snap: () => { // qrScan.animate._snap();
      document.querySelector('.pp-scanner--status .pp-scanner--status__snap').classList.remove('snap-anim');

      $('.pp-scanner--status .pp-scanner--status__snap')
        .addClass('snap-anim')
        .one('webkitAnimationEnd oanimationend msAnimationEnd animationend',
          function (e) {
          // code to execute after animation ends
          document.querySelector('.pp-scanner--status .pp-scanner--status__snap').classList.remove('snap-anim');
        });
    },

    _showToast: (message, duration) => { // qrScan.animate._showToast(message, duration);
      //let notification = document.querySelector('.mdl-js-snackbar');

      if (duration == undefined) duration = 5000;

      M.Toast.dismissAll();

      M.toast({html: message, displayLength: duration});
    },

    _success: () => { // qrScan.animate._success();
      let successHint = document.querySelector('.pp-scanner--status__success');
      let errorHint = document.querySelector('.pp-scanner--status__error');

      errorHint.classList.remove('snap-status-in', 'snap-status-out');
      if (snapTimeout !== undefined) clearTimeout(snapTimeout);

      successHint.classList.remove('snap-status-in', 'snap-status-out');
      successHint.classList.add('snap-status-in');

      snapTimeout = setTimeout(function () {
        // code to execute after animation ends
        $(successHint)
          .removeClass('snap-status-in')
          .addClass('snap-status-out')
          .one('webkitAnimationEnd oanimationend msAnimationEnd animationend',
            function (e) {
            // code to execute after animation ends
            successHint.classList.remove('snap-status-out');
        });
      }, 3000);
    },

    _error: () => { // qrScan.animate._error();
      let successHint = document.querySelector('.pp-scanner--status__success');
      let errorHint = document.querySelector('.pp-scanner--status__error');

      successHint.classList.remove('snap-status-in', 'snap-status-out');

      if (snapTimeout !== undefined) clearTimeout(snapTimeout);

      errorHint.classList.remove('snap-status-in', 'snap-status-out');
      errorHint.classList.add('snap-status-in');

      snapTimeout = setTimeout(function () {
        // code to execute after animation ends
        $(errorHint)
          .removeClass('snap-status-in')
          .addClass('snap-status-out')
          .one('webkitAnimationEnd oanimationend msAnimationEnd animationend',
            function (e) {
              // code to execute after animation ends
              errorHint.classList.remove('snap-status-out');
            });
      }, 3000);
    },

    _loading: (boolean) => { // qrScan.animate._loading(boolean);
      if (!boolean) {
        qrScan.LOADING.classList.add('transparent');
      }
      else {
        qrScan.LOADING.classList.remove('transparent');
      }
    },
/*
    _syncing: (boolean) => { // qrScan.animate._syncing(boolean);
      if (boolean) {
        document.getElementById('manualSync').classList.add('syncing');
      }
      else {
        document.getElementById('manualSync').classList.remove('syncing');
      }
    },

    _changeSyncStatus: () => { // qrScan.animate._changeSyncStatus();
      let data_len = qrScan.data.length;

      //setTimeout(function () {
        for (let i = 0; i < data_len; i++) {
          let icon = document.querySelector('[data-id="' + qrScan.data[i][x].id + '"] .material-icons');
          let status = document.querySelector('[data-id="' + qrScan.data[i][x].id + '"] p');

          if (qrScan.data[i][x].synced === 1) {
            icon.innerHTML = 'cloud_done';
            icon.classList.remove('red');
            icon.classList.add('green');
            status.innerHTML = 'Presença confirmada';
          }
          else if (qrScan.data[i][x].synced === 2) {
            icon.innerHTML = 'close';
            icon.classList.remove('green');
            icon.classList.add('red');
            status.innerHTML = 'Usuário com irregularidades<br>Toque para enviar para a PROPESP';
          }
          else {
            icon.innerHTML = 'cloud_off';
            icon.classList.remove('red','green');
            status.innerHTML = 'Não sincronizado';
          }
        }
      //}, 0);
    },*/

    _pageLoaded: () => { // qrScan.animate._pageLoaded();
      document.querySelector('.pp-loading-page').style.display = 'none';
    }
  },

  // Creates a new instance of Clusterize
  newClusterize: () => { // qrScan.newClusterize();
    clusterize = new Clusterize({
      rows: actualLiArr,
      tag: 'ul',
      scrollId: actualScrollId,
      contentId: actualContentId,
      no_data_text: 'Nenhum bolsista'
    });
  },

  updateCluster: (array) => { // qrScan.updateCluster(array);
    clusterize.update(array);
  },

  clearHTML: (elemId) => { // qrScan.clearHTML(elemId);
    document.getElementById(elemId).innerHTML = '';
  },


/*
  sendResponse: (dados) => { // qrScan.sendResponse(a);
    let path = 'classes/access_presence_list.php';

    // console.log(dados);
    $.ajax({
      type: 'POST',
      url: protocol + '://' + host + '/' + path,
      crossDomain: true,
      data: {
        'dados': JSON.stringify(dados)
      },
    	cache: false,
      success: (response) => {
        console.log('Sincronizado com sucesso');

        qrScan.onSendSuccess(response);
      },
      error: (jqXHR, textStatus, errorThrown) => {
        qrScan.onSendError(jqXHR, textStatus, errorThrown);
      }
    });
  },

  onSendSuccess: (response) => { // qrScan.onSendSuccess();
    // console.log(response);

    qrScan.animate._changeSyncStatus();

    qrScan.animate._syncing(false);
    qrScan.animate._showToast('Sincronizado com sucesso.');
  },

  onSendError: (jqXHR, textStatus, errorThrown) => { // qrScan.onSendSuccess();
    qrScan.animate._changeSyncStatus();

    qrScan.animate._syncing(false);
    qrScan.animate._showToast('Erro ao sincronizar.');

    console.error(jqXHR.responseText);
    console.error('Erro ao sincronizar (' + textStatus + '): ' + errorThrown);
  },

  sync: () => { // qrScan.sync();
    let path = 'classes/retrieve_scholarship_holders.php';

    qrScan.animate._syncing(true);
    qrScan.animate._showToast('Sincronizando...');

    $.ajax({
      url: protocol + '://' + host + '/' + path,
      success: (result) => {
        let found, synced, error, indexj, indexi;
        let data_len = qrScan.data.length;
        let result_len = result.length;

        // console.log('\n\n');
        // console.log(result);

        //
        client: for (let i = 0; i < data_len; i++) {
          // console.log('data[' + i + ']: ' + qrScan.data[i][x].id);

          // Synced
          if (qrScan.data[i][x].synced === 1) {
            synced = true;
            indexi = i;

            // console.log('Já sincronizado: ' + qrScan.data[i][x].id);
          }
          // Not synced
          else if (qrScan.data[i][x].synced === 0 || qrScan.data[i][x].synced === undefined) {
            synced = false;

            // console.log('Não sincronizado: ' + qrScan.data[i][x].id);
          }

          api: for (let j = 0; j < result_len; j++) {
            // console.log('    result[' + j + ']: ' + result[j].id);

            // SH found
            if (qrScan.data[i][x].id == result[j].id) {
              // console.log('    ID de ' + qrScan.data[i][x].id + ' encontrado na posição [' + j + ']');

              found = true;
              indexi = i;
              indexj = j;

              // console.log('    ' + qrScan.data[i][x].nome + ' encontrado na posição [' + j + ']');

              break api;
            }
            // SH not found
            else {
              found = false;
              indexi = i;
            }

            synced = true;
          }

          if (found === true) {
            // If found, the scholarship holder (SH) gets marked as 'synced' and encrypted saved data is updated
            let act;

            // console.log('qrScan.data['+indexi+'][x].synced = 1');

            qrScan.data[indexi][x].synced = 1;
            qrScan.data[indexi][x].id = result[indexj].id;

            // Add 'id' from the matched item in 'syncArr' array
            syncArr.push(result[indexj].id);
            // Remove repeated participants (ES6)
            syncArr = [...new Set(syncArr)]; // from: https://stackoverflow.com/a/15868720/5125223
            syncArr.sort(qrScan.sortNumber);

            // Actual string Array
            act = JSON.stringify(qrScan.data);
            // console.log('Dados atualizados: ' + act);

            // Encrypt data
            enc = CryptoJS.AES.encrypt(act, _k);

            localStorage.setItem('data', enc);

            // console.log('IDs encontrados: ' + syncArr);
          }
          else {
            // console.log('qrScan.data['+indexi+'][x].synced = 2');

            qrScan.data[indexi][x].synced = 2;
          }

          error = undefined;
          found = undefined;
          synced = undefined;
        }

        qrScan.sendResponse(qrScan.data);

        // Show the array with the SH id's
        // console.log(syncArr);
      },

      error: (jqXHR, textStatus, errorThrown) => {
        qrScan.onSendError(jqXHR, textStatus, errorThrown);
      }
    });
  }
  */
};



var clusterize = new Clusterize({
  rows: saved_li_arr,
  tag: 'ul',
  scrollId: 'pp-scanned-list__cluster-scroll--saved',
  contentId: 'pp-scanned-list__cluster-content--saved',
  no_data_text: 'Nenhum bolsista',
  callbacks: {
    clusterChanged: () => {
      // console.log('cluster changed!');
    }
  }
});


// Load saved data from localStorage if it exists
if (localStorage.getItem('data') !== null) {
  qrScan.loadFromLS('data');
  qrScan.updateHTMLArray('data');
  // console.log(qrScan.data.length);
}

// Load rejected data from localStorage if it exists
if (localStorage.getItem('rejected') !== null) {
  qrScan.loadFromLS('rejected');
  qrScan.updateHTMLArray('rejected');
  // console.log(qrScan.data.length);
}






let options = {};
// init options for scanner
options = qrScan.initVideoObjectOptions('pp-scanner--camera');

let cameraId = 0;

qrScan.initScanner(options);

qrScan.initAvaliableCameras(function () {
  cameraId = 1; // 1 = rear camera
});

qrScan.initCamera(cameraId);

qrScan.scanStart(function (data) {
  qrScan.saveScannedData(data);
});






// Camera Event Listeners
scanner.addListener('active', function () {
  qrScan.animate._loading(false);
});

scanner.addListener('inactive', function () {
  qrScan.animate._loading(true);
});



// Clear rejected list
/*
document.getElementById('manualSync').addEventListener('click', function () { // jshint ignore:line
  qrScan.sync();
});
*/
$('.dropdown-trigger').dropdown({
  constrainWidth: false,
  inDuration: 300,
  outDuration: 300
});

$('.tabs').tabs({
  swipeable: true,
  duration: 200,

  onShow: () => {
    const tab1 = document.querySelector('a[href="#scroll-tab-1"]').classList.contains('active');
    const tab2 = document.querySelector('a[href="#scroll-tab-2"]').classList.contains('active');
    const tab3 = document.querySelector('a[href="#scroll-tab-3"]').classList.contains('active');

    let contentAreaSaved = document.getElementById('pp-scanned-list__cluster-content--saved');
    let contentAreaRejected = document.getElementById('pp-scanned-list__cluster-content--rejected');

    if (tab1 && !isCameraTabActive) {
      // console.log('Camera activated.');
      actualScrollId = undefined;
      actualContentId = undefined;
      actualLiArr = undefined;

      isCameraTabActive = true;

      // qrScan.clearHTML('pp-scanned-list__cluster-content--saved');
      // qrScan.clearHTML('pp-scanned-list__cluster-content--rejected');

      setTimeout(function () {
        scanner.start(cameraGlobal);
      }, 1500);
    }
    else if (!tab1 && isCameraTabActive) {
      // console.log('Camera deactivated.');

      isCameraTabActive = false;

      scanner.stop();
    }

    if (tab2) {
      actualScrollId = 'pp-scanned-list__cluster-scroll--saved';
      actualContentId = 'pp-scanned-list__cluster-content--saved';
      actualLiArr = saved_li_arr;

      qrScan.newClusterize();
      // qrScan.animate._changeSyncStatus();

      contentAreaSaved.scrollTop = contentAreaSaved.scrollHeight; // Scroll to to the end of the list
    }
    else if (tab3) {
      actualScrollId = 'pp-scanned-list__cluster-scroll--rejected';
      actualContentId = 'pp-scanned-list__cluster-content--rejected';
      actualLiArr = rejected_li_arr;

      qrScan.newClusterize();

      contentAreaRejected.scrollTop = contentAreaRejected.scrollHeight; // Scroll to to the end of the list
    }
  }
});
