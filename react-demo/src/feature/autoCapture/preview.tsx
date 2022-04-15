import React, { useCallback, useContext, useEffect, useState, useRef } from 'react';
import produce from 'immer';
import ZoomVideo from "@zoom/videosdk";
import { useMount } from '../../hooks';
import './preview.scss';
import MicrophoneButton from '../video/components/microphone';
import CameraButton from '../video/components/camera';
import { message } from 'antd';
import { MediaDevice } from '../video/video-types';


// import face api
import runDetection from '../../utils/face_detection/index';
import Webcam from "react-webcam";


// label: string;
// deviceId: string;
let prevMicFeedbackStyle = '';
let micFeedBackInteval: any = '';

let localAudio = ZoomVideo.createLocalAudioTrack();
let localVideo = ZoomVideo.createLocalVideoTrack();
let allDevices;

const mountDevices: () => Promise<{
  mics: MediaDevice[];
  speakers: MediaDevice[];
  cameras: MediaDevice[];
}> = async () => {
  allDevices = await ZoomVideo.getDevices();
  const cameraDevices: Array<MediaDeviceInfo> = allDevices.filter(function (device) {
    return device.kind === 'videoinput';
  });
  const micDevices: Array<MediaDeviceInfo> = allDevices.filter(function (device) {
    return device.kind === 'audioinput';
  });
  const speakerDevices: Array<MediaDeviceInfo> = allDevices.filter(function (
    device,
  ) {
    return device.kind === 'audiooutput';
  });
  return {
    mics: micDevices.map((item) => {
      return { label: item.label, deviceId: item.deviceId };
    }),
    speakers: speakerDevices.map((item) => {
      return { label: item.label, deviceId: item.deviceId };
    }),
    cameras: cameraDevices.map((item) => {
      return { label: item.label, deviceId: item.deviceId };
    }),
  };
};

const AUDIO_MASK = 1,
  MIC_MASK = 2,
  VIDEO_MASK = 4;

let PREVIEW_VIDEO: any;
let width: number = 800;
let height: number = 450;

const updateMicFeedbackStyle = () => {
  const newVolumeIntensity = localAudio.getCurrentVolume();
  let newMicFeedbackStyle = '';

  if (newVolumeIntensity === 0) {
    newMicFeedbackStyle = '';
  } else if (newVolumeIntensity <= 0.05) {
    newMicFeedbackStyle = 'mic-feedback__very-low';
  } else if (newVolumeIntensity <= 0.1) {
    newMicFeedbackStyle = 'mic-feedback__low';
  } else if (newVolumeIntensity <= 0.15) {
    newMicFeedbackStyle = 'mic-feedback__medium';
  } else if (newVolumeIntensity <= 0.2) {
    newMicFeedbackStyle = 'mic-feedback__high';
  } else if (newVolumeIntensity <= 0.25) {
    newMicFeedbackStyle = 'mic-feedback__very-high';
  } else {
    newMicFeedbackStyle = 'mic-feedback__max';
  }
  const micIcon: any = document.getElementById('auido-volume-feedback');
  if (prevMicFeedbackStyle !== '' && micIcon) {
    micIcon.classList.toggle(prevMicFeedbackStyle);
  }

  if (newMicFeedbackStyle !== '' && micIcon) {
    micIcon.classList.toggle(newMicFeedbackStyle);
  }
  console.log(newMicFeedbackStyle, newVolumeIntensity);
  prevMicFeedbackStyle = newMicFeedbackStyle;
};

const encodePreviewOptions = (
  isStartedAudio: boolean,
  isMuted: boolean,
  isStartedVideo: boolean,
) => {
  let res = 0;
  res = (res | +isStartedVideo) << 1;
  res = (res | +isMuted) << 1;
  res = res | +isStartedAudio;
  return res;
};
const decodePreviewOptions = (val: number) => {
  /*
      LSB: audio,
      MSB: video
   */
  const isStartedAudio = !!((val & AUDIO_MASK) === AUDIO_MASK);
  const isMuted = !!((val & MIC_MASK) === MIC_MASK);
  const isStartedVideo = !!((val & VIDEO_MASK) === VIDEO_MASK);
  return { isStartedVideo, isMuted, isStartedAudio };
};

const PreviewContainer = () => {
  const [isStartedAudio, setIsStartedAudio] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isStartedVideo, setIsStartedVideo] = useState<boolean>(false);
  const [micList, setMicList] = useState<MediaDevice[]>([]);
  const [speakerList, setSpeakerList] = useState<MediaDevice[]>([]);
  const [cameraList, setCameraList] = useState<MediaDevice[]>([]);
  const [activeMicrophone, setActiveMicrophone] = useState('');
  const [activeSpeaker, setActiveSpeaker] = useState('');
  const [activeCamera, setActiveCamera] = useState('');

  const onCameraClick = useCallback(async () => {
    if (isStartedVideo) {
      await localVideo?.stop();
      setIsStartedVideo(false);
    } else {
      await localVideo?.start(PREVIEW_VIDEO);
      setIsStartedVideo(true);
    }
  }, [isStartedVideo]);
  const onMicrophoneClick = useCallback(async () => {
    if (isStartedAudio) {
      if (isMuted) {
        await localAudio?.unmute();
        micFeedBackInteval = setInterval(updateMicFeedbackStyle, 500);
        setIsMuted(false);
      } else {
        await localAudio?.mute();
        if (micFeedBackInteval) {
          clearInterval(micFeedBackInteval);
        }
        setIsMuted(true);
      }
    } else {
      await localAudio?.start();
      setIsStartedAudio(true);
    }
  }, [isStartedAudio, isMuted]);
  const onMicrophoneMenuClick = async (key: string) => {
    const [type, deviceId] = key.split('|');
    if (type === 'microphone') {
      if (deviceId !== activeMicrophone) {
        await localAudio.stop();
        setIsMuted(true);
        localAudio = ZoomVideo.createLocalAudioTrack(deviceId);
        await localAudio.start();
        setActiveMicrophone(deviceId);
      }
    } else if (type === 'leave audio') {
      await localAudio.stop();
      setIsStartedAudio(false);
    }
  };
  const onSwitchCamera = async (key: string) => {
    if (localVideo) {
      if (activeCamera !== key) {
        await localVideo.stop();
        localVideo = ZoomVideo.createLocalVideoTrack(key);
        localVideo.start(PREVIEW_VIDEO);
        setActiveCamera(key);
      }
    }
  };

  useEffect(() => {
    const encodeVal = encodePreviewOptions(isStartedAudio, isMuted, isStartedVideo);
    console.log('preview encode val', encodeVal);
    const decodeOption = decodePreviewOptions(encodeVal);
    console.log('preview config', decodePreviewOptions(encodeVal));
    message.info(JSON.stringify(decodeOption, null, 2));
    console.log(micList);
  }, [isStartedAudio, isMuted, isStartedVideo]);

  useMount(() => {
    PREVIEW_VIDEO = document.getElementById('js-preview-video');
    mountDevices().then((devices) => {
      console.log('devicesdevicesdevicesdevices', devices);
      setMicList(devices.mics);
      setCameraList(devices.cameras);
      // setSpeakerList(devices.speakers);
    });
  });

  // face recognition
  const video = useRef<HTMLVideoElement | null>(null);
  const canvasDetec = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    console.log("camera", isStartedVideo);
    if(isStartedVideo){
      if(video.current && canvasDetec.current){
        runDetection(video.current, canvasDetec.current, width, height )
      }
    }
  }, [isStartedVideo])

  // camera
  const [image,setImage]=useState('');
  const videoConstraints = {
    width: width,
    height: height,
    facingMode: "user"
  };
  const webcamRef = useRef<Webcam>(null);
  const capture = () => {
    console.log("capture");
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if(imageSrc){
        setImage(imageSrc)
      }
    }
  }

  useEffect(() => {
    // jika camera di aktifkan
    if(isStartedVideo){
      setInterval(capture, 5000)
    }
  }, [isStartedVideo])

  // console.log(image);

  return (
    <div className="js-preview-view">
      <div id="js-preview-view" className="container preview__root">
        <span>
          <h1>Audio And Video Preview</h1>
        </span>
        <div className="container video-app">
          <div style={{ position: "relative", width: 800, height:450, marginLeft: "auto", marginRight: "auto" }}>
            <video
              id="js-preview-video"
              className="preview-video"
              muted={true}
              data-video="0"
              ref={video}
            ></video>
            <Webcam
              style={{ position: "absolute", top:0, left:0, zIndex: -1}}
              className="preview-video"
              audio={false}
              height={height}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              width={width}
              videoConstraints={videoConstraints}
            />
            <canvas id="canvas" ref={canvasDetec} width="800" height="450" style={{ position: "absolute", top:0, left:0}} ></canvas>
          </div>
          <div className="video-footer video-operations video-operations-preview">
            <MicrophoneButton
              isStartedAudio={isStartedAudio}
              isMuted={isMuted}
              onMicrophoneClick={onMicrophoneClick}
              onMicrophoneMenuClick={onMicrophoneMenuClick}
              microphoneList={micList}
              speakerList={speakerList}
              activeMicrophone={activeMicrophone}
              activeSpeaker={activeSpeaker}
            />
            <CameraButton
              isStartedVideo={isStartedVideo}
              onCameraClick={onCameraClick}
              onSwitchCamera={onSwitchCamera}
              cameraList={cameraList}
              activeCamera={activeCamera}
            />
          </div>
          {/* <!-- canvas untuk menggambar frame deteksi wajah  --> */}
          
        </div>

        <hr />
        <h2>ambil gambar setiap 5 detik</h2>
        <img className="preview-video" src={image} alt=''/>
      </div>
    </div>
  );
};

export default PreviewContainer;
