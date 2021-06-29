function onInit() 
{
  USB.setConsole(); // https://www.espruino.com/Troubleshooting#console
  
  const wifi = require("Wifi");
  const credentials = require('credentials');

  //const credentials = { 
  //	wifi: "ABCNET",
  //	wifi_pass: "abcPASS",
  //	mail: "info%40yourdomain.com",
  //	token: "NA22M11IXX"
  //};

  const WIFI_NAME = credentials.wifi;
  const WIFI_OPTIONS = { password : credentials.wifi_pass };

  const valueLength = 17;
  const startIndex = 307;
  const endIndex = 336;
  let tipoCambioCompra = 0;
  let tipoCambioVenta = 0;

  const URL = "https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx/ObtenerIndicadoresEconomicosXML";

  const Clock = require("clock").Clock;
  let clk = new Clock();

  // Setup SPI
  const spi = new SPI();
  spi.setup({ sck:A5, mosi:A7 });

  // Initialise the OLED
  const g = require("SSD1306").connectSPI(spi,B7 /*DC*/, B8 /*RST*/, function() {
    // OLED ready!
    consoleLog('OLED ready!');

    wifi.connect(WIFI_NAME, WIFI_OPTIONS, function(err) {
      if (err) {
        consoleLog('Connection error: ' + err);
        return;
      }
      consoleLog('Connected to Wifi!');

      function updateData()
      {
        try {
          g.clear();
          g.flip();
          g.setFontVector(10);

          consoleLog('Updating ...');
          const date = clk.getDate();
          //console.log(date);

          // 9%2F06%2F2021, formato codificado de la fecha
          const dateStr = `${date.getDate()}%2F${date.getMonth()+1}%2F${date.getFullYear()}`;
          //console.log(dateStr);

          const queryBase = `&FechaInicio=${dateStr}&FechaFinal=${dateStr}&Nombre=TrinoSystems&SubNiveles=N&`+
          `CorreoElectronico=${credentials.mail}&Token=${credentials.token}`;

          const queryCompra = `Indicador=317${queryBase}`;
          const queryVenta = `Indicador=318${queryBase}`;

          g.clear();
          g.setFontVector(10);
          consoleLog('Getting data ...');

          post(URL, queryCompra, function(d) {
            //console.log(`HTTP Response Body: ${d}`);

            tipoCambioCompra = Number(d.substring(startIndex+valueLength, endIndex));
            //console.log(`Compra: ${tipoCambioCompra}`);
            g.setFontVector(10);
            g.clear();
            g.drawString('Tipos de Cambio',0,0);
            g.drawString('Compra',0,15);
            g.drawString('Venta',0,40);
            g.drawString('....',0,25);
            g.drawString('....',0,50);
            g.drawString(`${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`,70,55);
            g.flip();
            g.setFontVector(15);
            g.drawString(tipoCambioCompra,0,25);
            g.flip();

            post(URL, queryVenta, function(d) {
              //console.log(`HTTP Response Body: ${d}`);

              tipoCambioVenta = Number(d.substring(startIndex+valueLength, endIndex));
              //console.log(`Venta: ${tipoCambioVenta}`);
              g.setFontVector(15);
              g.drawString(tipoCambioVenta,0,50);
              g.flip();
            });
          });
        }
        catch (e)
        {
          consoleLog(`Error: ${e.message}`);
        }
      }
      
      // Se actualiza el reloj del sistema
      setDate(function(){
        
        updateData();
      });

    });
  });


  function post(postURL, content, callback) {
    console.log('HTTP Request started ...');
    // 317 = Tipo de Cambio de la Compra
    // 318 = Tipo de Cambio de la Venta
    // 333 = Tipo de cambio del dólar respecto a otras monedas, Euro
    // 330 = Tipo de cambio del dólar respecto a otras monedas, Libra esterlina

    const options = url.parse(postURL);
    options.method = 'POST';

    options.headers = {
      "Host": "gee.bccr.fi.cr",
      "Accept": "application/xml",
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length" : content.length,
      "Connection": "close"
    };

    //console.log(options);

    const req = require("http").request(options, function(res)  {
      let d = "";
      res.on('data', function(data) { d+= data; });
      res.on('close', function(data) {
        console.log('HTTP Request ended!');
        
        // Se envían los datos recibidos
        callback(d);
      });
    });
    req.on('error', function(e) {
      callback();
    });
    req.end(content);
  }

  function setDate(callback) {
    const options = url.parse(URL);
    options.method = 'GET';

    const req = require("http").request(options, function(res)  {
      let d = "";
      res.on('data', function(data) { d+= data; });
      res.on('close', function(data) {
        consoleLog('HTTP Request ended!');
        // Se obtiene la fecha y hora del servidor llamado
        // y en caso necesario se hace la actualización del reloj local
        //console.log(this.headers.Date);
        consoleLog(this.headers.Date);
        clk.setClock(Date.parse(this.headers.Date));

        // Se continua con la ejecución
        callback();
      });
    });
    req.on('error', function(e) {
      callback();
    });
    req.end();
  }

  function consoleLog(text)
  {
    // https://www.espruino.com/Troubleshooting#console
    //console.log(text);
	  
    if(g)
    {
      g.clear();
      g.drawString(text,0,0);
      g.flip();
    }
  }

}