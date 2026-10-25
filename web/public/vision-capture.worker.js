let face, pose, previousBody, generation, headSamples = [], classifyFrame;
self.onmessage = async ({ data }) => {
    if (data.type === 'warm') {
        try {
            const { FaceLandmarker, PoseLandmarker, FilesetResolver } = await import("/vendor/mediapipe/vision_bundle.mjs");
            ({classifyFrame}=await import('/vendor/mediapipe/eye-contact-metrics.mjs'));
            const files = await FilesetResolver.forVisionTasks('/vendor/mediapipe');
            face = await FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task' }, runningMode: 'VIDEO', numFaces: 1, minFaceDetectionConfidence:.7, minFacePresenceConfidence:.7, minTrackingConfidence:.7, outputFaceBlendshapes: data.eyeContact===true, outputFacialTransformationMatrixes: data.eyeContact===true });
            pose = await PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task' }, runningMode: 'VIDEO', numPoses: 1, outputSegmentationMasks: false });
            self.postMessage({ type: 'ready' });
        } catch { self.postMessage({ type: 'unavailable' }); }
        return;
    }
    const frame = data.frame;
    try {
        if (!face || !pose) return;
        const epoch=`${data.generation}:${data.epoch}`;
        if (generation !== epoch) { generation=epoch;previousBody=null;headSamples=[]; }
        const faceResult = face.detectForVideo(frame, data.timestamp);
        const landmarks = faceResult.faceLandmarks[0];
        const shoulders = pose.detectForVideo(frame, data.timestamp).landmarks[0];
        let facing = null, shouldersVisible = null, bodyShift = null, eyeContact = 'none';
        if (landmarks) {
            const left = landmarks[33], right = landmarks[263], nose = landmarks[1];
            const width = Math.hypot(left.x - right.x, left.y - right.y);
            if (width > .06 && [left,right,nose].every(p=>p.x>.02&&p.x<.98&&p.y>.02&&p.y<.98)) {
                if(data.eyeContact===true)eyeContact=classifyFrame({scores:Object.fromEntries((faceResult.faceBlendshapes?.[0]?.categories??[]).map(c=>[c.categoryName,c.score])),matrix:faceResult.facialTransformationMatrixes?.[0]?.data});
                headSamples.push(Math.abs(nose.x-(left.x+right.x)/2)/width);headSamples=headSamples.slice(-3);
                if(headSamples.length===3)facing=headSamples.reduce((a,b)=>a+b,0)/3<.3;
            } else headSamples=[];
        } else headSamples=[];
        if (shoulders) {
            const visible = [shoulders[11], shoulders[12]].every(p => p.visibility > .8);
            shouldersVisible = visible ? [shoulders[11], shoulders[12]].every(p => p.x > .03 && p.x < .97 && p.y > .03 && p.y < .97) : null;
            if (shouldersVisible) {
                const body = { x: (shoulders[11].x + shoulders[12].x) / 2, y: (shoulders[11].y + shoulders[12].y) / 2, width: Math.hypot(shoulders[11].x - shoulders[12].x, shoulders[11].y - shoulders[12].y), at: data.at };
                if (previousBody && body.at > previousBody.at && body.at - previousBody.at < 1.2 && body.width > .05)
                    bodyShift = Math.hypot(body.x - previousBody.x, body.y - previousBody.y) / body.width;
                previousBody = body;
            } else previousBody = null;
        } else previousBody = null;
        self.postMessage({ type: 'sample', generation: data.generation, epoch:data.epoch, at: data.at, facing, shouldersVisible, bodyShift, ...(data.eyeContact===true?{eyeContact}:{}) });
    } catch { self.postMessage({ type: 'unavailable' }); }
    finally { frame.close(); self.postMessage({ type: 'frameDone' }); }
};
