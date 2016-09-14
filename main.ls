require! {
  express
  'body-parser'
  request
  './options.json'
}

var mobile-ip

app = express!

#app.enable 'trust proxy'

app.use express.static 'static'

app.use body-parser.urlencoded extended: false

app.options \/ (req, res) !->
  res.header 'Access-Control-Allow-Origin'  \*
  res.header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS'
  res.header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, Content-Length, X-Requested-With'
  res.header 'Content-Type' 'application/json'
  res.send JSON.stringify options

app.get \/* (req, res, next) !->
  res.header 'Access-Control-Allow-Origin' \*
  next!

app.get \/status (req, res) !->
  unless mobile-ip?
    res.send \standby
    return
  error, response, body <-! request "http://#mobile-ip:8080"
  res.send if err? then \standby else \active

app.post \/api/* (req, res) !->
  request "http://#mobile-ip:8080/#{req.params[0]}" .pipe res

app.get \/is-connected (req, res) !->
  unless mobile-ip?
    #res.status 400 .send 'Mobile phone IP address not set'
    res.send \false
    return
  error, response, body <-! request "http://#mobile-ip:8080"
  res.send '' + not error?

app.get \/set-mobile-ip (req, res) !->
  mobile-ip := req.query.ip
  res.end!
  #res.redirect \../

app.listen 8080
