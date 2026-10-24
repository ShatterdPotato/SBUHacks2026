let face, pose, previousBody;
self.onmessage = async ({ data }) => {
    if (data.type === 'warm') {
        try {
            const { FaceLandmarker, PoseLandmarker, FilesetResolver } = await import("/vendor/mediapipe/vision_bundle.mjs");
            const files = await FilesetResolver.forVisionTasks('/vendor/mediapipe');
            face = await FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task' }, runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: false, outputFacialTransformationMatrixes: false });
            pose = await PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task' }, runningMode: 'VIDEO', numPoses: 1, outputSegmentationMasks: false });
            self.postMessage({ type: 'ready' });
        } catch { self.postMessage({ type: 'unavailable' }); }
        return;
    }
    const frame = data.frame;
    try {
        if (!face || !pose) return;
        const landmarks = face.detectForVideo(frame, data.timestamp).faceLandmarks[0];
        const shoulders = pose.detectForVideo(frame, data.timestamp).landmarks[0];
        let facing = null, shouldersVisible = null, bodyShift = null;
        if (landmarks) {
            const left = landmarks[33], right = landmarks[263], nose = landmarks[1];
            const width = Math.hypot(left.x - right.x, left.y - right.y);
            if (width > .03) facing = Math.abs(nose.x - (left.x + right.x) / 2) / width < .3;
        }
        if (shoulders) {
            shouldersVisible = [shoulders[11], shoulders[12]].every(p => p.visibility > .6 && p.x > .03 && p.x < .97 && p.y > .03 && p.y < .97);
            if (shouldersVisible) {
                const body = { x: (shoulders[11].x + shoulders[12].x) / 2, y: (shoulders[11].y + shoulders[12].y) / 2, width: Math.hypot(shoulders[11].x - shoulders[12].x, shoulders[11].y - shoulders[12].y), at: data.at };
                if (previousBody && body.at > previousBody.at && body.at - previousBody.at < 1.2 && body.width > .05)
                    bodyShift = Math.hypot(body.x - previousBody.x, body.y - previousBody.y) / body.width;
                previousBody = body;
            } else previousBody = null;
        } else previousBody = null;
        self.postMessage({ type: 'sample', generation: data.generation, at: data.at, facing, shouldersVisible, bodyShift });
    } catch { self.postMessage({ type: 'unavailable' }); }
    finally { frame.close(); self.postMessage({ type: 'frameDone' }); }
};
