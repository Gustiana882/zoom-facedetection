# Zoom Video Face Recognition
referensi
- https://marketplace.zoom.us/docs/sdk/video/web
- https://github.com/justadudewhohacks/face-api.js
- https://github.com/zoom/sample-app-videosdk

## Flow
![alt text](https://github.com/Gustiana882/zoom-facedetection/blob/master/flow.png "Flow")


## React Demo
```
git clone git@github.com:Gustiana882/zoom-facedetection.git
cd sample-app-videosdk/react-demo
npm install
npm run start

```

Before you can use the demo app, you must update your config in ```react-demo/src/config/dev.ts```

## Purejs Demo
```
git clone git@github.com:Gustiana882/zoom-facedetection.git
cd sample-app-videosdk/purejs-demo
npm install
npm run start

```

```npm run https``` and ```npm run corp``` can also be used as alternatives to ```npm run start```; ```corp``` provides proper cross-origin isolation that optimizes performance through enabling the use of SharedArrayBuffers

Before you can use the demo app, you must update your config in ```purejs-demo/src/js/config.js```

You can launch the app at http://localhost:3000 or https://localhost:3000 (if using ```npm run https```)
