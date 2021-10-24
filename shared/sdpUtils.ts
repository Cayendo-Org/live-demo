interface FTMP {
    pt: string;
    params: Record<string, string>;
}

export const maybeSetOpusOptions = (sdp: string, params: { opusStereo: string; opusFec: string; opusDtx: string; opusMaxPbr: string; }) => {
    // Set Opus in Stereo, if stereo is true, unset it, if stereo is false, and
    // do nothing if otherwise.
    if (params.opusStereo === 'true') {
        sdp = setCodecParam(sdp, 'opus/48000', 'stereo', '1');
    } else if (params.opusStereo === 'false') {
        sdp = removeCodecParam(sdp, 'opus/48000', 'stereo');
    }

    // Set Opus FEC, if opusfec is true, unset it, if opusfec is false, and
    // do nothing if otherwise.
    if (params.opusFec === 'true') {
        sdp = setCodecParam(sdp, 'opus/48000', 'useinbandfec', '1');
    } else if (params.opusFec === 'false') {
        sdp = removeCodecParam(sdp, 'opus/48000', 'useinbandfec');
    }

    // Set Opus DTX, if opusdtx is true, unset it, if opusdtx is false, and
    // do nothing if otherwise.
    if (params.opusDtx === 'true') {
        sdp = setCodecParam(sdp, 'opus/48000', 'usedtx', '1');
    } else if (params.opusDtx === 'false') {
        sdp = removeCodecParam(sdp, 'opus/48000', 'usedtx');
    }

    // Set Opus maxplaybackrate, if requested.
    if (params.opusMaxPbr) {
        sdp = setCodecParam(
            sdp, 'opus/48000', 'maxplaybackrate', params.opusMaxPbr);
    }
    return sdp;
};

export const maybeSetAudioSendBitRate = (sdp: string, params: { audioSendBitrate: number; }) => {
    if (!params.audioSendBitrate) {
        return sdp;
    }
    console.log('Prefer audio send bitrate: ' + params.audioSendBitrate);
    return preferBitRate(sdp, params.audioSendBitrate, 'audio');
};

export const maybeSetAudioReceiveBitRate = (sdp: string, params: { audioRecvBitrate: number; }) => {
    if (!params.audioRecvBitrate) {
        return sdp;
    }
    console.log('Prefer audio receive bitrate: ' + params.audioRecvBitrate);
    return preferBitRate(sdp, params.audioRecvBitrate, 'audio');
};

export const maybeSetVideoSendBitRate = (sdp: string, params: { videoSendBitrate: number; }) => {
    if (!params.videoSendBitrate) {
        return sdp;
    }
    console.log('Prefer video send bitrate: ' + params.videoSendBitrate);
    return preferBitRate(sdp, params.videoSendBitrate, 'video');
};

export const maybeSetVideoReceiveBitRate = (sdp: string, params: { videoRecvBitrate: number; }) => {
    if (!params.videoRecvBitrate) {
        return sdp;
    }
    console.log('Prefer video receive bitrate: ' + params.videoRecvBitrate);
    return preferBitRate(sdp, params.videoRecvBitrate, 'video');
};

// Add a b=AS:bitrate line to the m=mediaType section.
export const preferBitRate = (sdp: string, bitrate: number, mediaType: string) => {
    let sdpLines = sdp.split('\r\n');

    // Find m line for the given mediaType.
    let mLineIndex = findLine(sdpLines, 'm=', mediaType);
    if (mLineIndex === null) {
        console.log('Failed to add bandwidth line to sdp, as no m-line found');
        return sdp;
    }

    // Find next m-line if string.
    let nextMLineIndex = findLineInRange(sdpLines, mLineIndex + 1, -1, 'm=');
    if (nextMLineIndex === null) {
        nextMLineIndex = sdpLines.length;
    }

    // Find c-line corresponding to the m-line.
    let cLineIndex = findLineInRange(sdpLines, mLineIndex + 1,
        nextMLineIndex, 'c=');
    if (cLineIndex === null) {
        console.log('Failed to add bandwidth line to sdp, as no c-line found');
        return sdp;
    }

    // Check if bandwidth line already exists between c-line and next m-line.
    let bLineIndex = findLineInRange(sdpLines, cLineIndex + 1,
        nextMLineIndex, 'b=AS');
    if (bLineIndex) {
        sdpLines.splice(bLineIndex, 1);
    }

    // Create the b (bandwidth) sdp line.
    let bwLine = 'b=AS:' + bitrate;
    // As per RFC 4566, the b line should follow after c-line.
    sdpLines.splice(cLineIndex + 1, 0, bwLine);
    sdp = sdpLines.join('\r\n');
    return sdp;
};

// Add an a=fmtp: x-google-min-bitrate=kbps line, if videoSendInitialBitrate
// is specified. We'll also add a x-google-min-bitrate value, since the max
// must be >= the min.
export const maybeSetVideoSendInitialBitRate = (sdp: string, params: { videoSendInitialBitrate: number; videoSendBitrate?: number; }) => {
    let initialBitrate = params.videoSendInitialBitrate;
    if (!initialBitrate) {
        return sdp;
    }

    // Validate the initial bitrate value.
    let maxBitrate = initialBitrate;
    let bitrate = params.videoSendBitrate;
    if (bitrate) {
        if (initialBitrate > bitrate) {
            console.log('Clamping initial bitrate to max bitrate of ' +
                bitrate + ' kbps.');
            initialBitrate = bitrate;
            params.videoSendInitialBitrate = initialBitrate;
        }
        maxBitrate = bitrate;
    }

    let sdpLines = sdp.split('\r\n');

    // Search for m line.
    let mLineIndex = findLine(sdpLines, 'm=', 'video');
    if (mLineIndex === null) {
        console.log('Failed to find video m-line');
        return sdp;
    }

    sdp = setCodecParam(sdp, 'VP8/90000', 'x-google-min-bitrate',
        params.videoSendInitialBitrate.toString());
    sdp = setCodecParam(sdp, 'VP8/90000', 'x-google-max-bitrate',
        maxBitrate.toString());

    return sdp;
};

// Promotes |audioSendCodec| to be the first in the m=audio line, if set.
export const maybePreferAudioSendCodec = (sdp: string, params: { audioSendCodec: string; }) => {
    return maybePreferCodec(sdp, 'audio', 'send', params.audioSendCodec);
};

// Promotes |audioRecvCodec| to be the first in the m=audio line, if set.
export const maybePreferAudioReceiveCodec = (sdp: string, params: { audioRecvCodec: string; }) => {
    return maybePreferCodec(sdp, 'audio', 'receive', params.audioRecvCodec);
};

// Promotes |videoSendCodec| to be the first in the m=audio line, if set.
export const maybePreferVideoSendCodec = (sdp: string, params: { videoSendCodec: string; }) => {
    return maybePreferCodec(sdp, 'video', 'send', params.videoSendCodec);
};

// Promotes |videoRecvCodec| to be the first in the m=audio line, if set.
export const maybePreferVideoReceiveCodec = (sdp: string, params: { videoRecvCodec: string; }) => {
    return maybePreferCodec(sdp, 'video', 'receive', params.videoRecvCodec);
};

// Sets |codec| as the default |type| codec if it's present.
// The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
export const maybePreferCodec = (sdp: string, type: string, dir: string, codec: string) => {
    let str = type + ' ' + dir + ' codec';
    if (!codec) {
        console.log('No preference on ' + str + '.');
        return sdp;
    }

    console.log('Prefer ' + str + ': ' + codec);

    let sdpLines = sdp.split('\r\n');

    // Search for m line.
    let mLineIndex = findLine(sdpLines, 'm=', type);
    if (mLineIndex === null) {
        return sdp;
    }

    // If the codec is available, set it as the default in m line.
    let payload = getCodecPayloadType(sdpLines, codec);
    if (payload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], payload);
    }

    sdp = sdpLines.join('\r\n');
    return sdp;
};

// Set fmtp param to specific codec in SDP. If param does not exists, add it.
export const setCodecParam = (sdp: string, codec: string, param: string, value: string) => {
    let sdpLines = sdp.split('\r\n');

    let fmtpLineIndex = findFmtpLine(sdpLines, codec);

    let fmtpObj: FTMP = {
        pt: "",
        params: {}
    };
    if (fmtpLineIndex === null) {
        let index = findLine(sdpLines, 'a=rtpmap', codec);
        if (index === null) {
            return sdp;
        }
        let payload = getCodecPayloadTypeFromLine(sdpLines[index]);
        fmtpObj.pt = payload.toString();
        fmtpObj.params = {};
        fmtpObj.params[param] = value;
        sdpLines.splice(index + 1, 0, writeFmtpLine(fmtpObj));
    } else {
        fmtpObj = parseFmtpLine(sdpLines[fmtpLineIndex]);
        fmtpObj.params[param] = value;
        sdpLines[fmtpLineIndex] = writeFmtpLine(fmtpObj);
    }

    sdp = sdpLines.join('\r\n');
    return sdp;
};

// Remove fmtp param if it exists.
export const removeCodecParam = (sdp: string, codec: string, param: string) => {
    let sdpLines = sdp.split('\r\n');

    let fmtpLineIndex = findFmtpLine(sdpLines, codec);
    if (fmtpLineIndex === null) {
        return sdp;
    }

    let map = parseFmtpLine(sdpLines[fmtpLineIndex]);
    delete map.params[param];

    let newLine = writeFmtpLine(map);
    if (newLine === null) {
        sdpLines.splice(fmtpLineIndex, 1);
    } else {
        sdpLines[fmtpLineIndex] = newLine;
    }

    sdp = sdpLines.join('\r\n');
    return sdp;
};

// Split an fmtp line into an object including 'pt' and 'params'.
export const parseFmtpLine = (fmtpLine: string): FTMP => {
    let fmtpObj: FTMP = {
        pt: "",
        params: {}
    };
    let spacePos = fmtpLine.indexOf(' ');
    let keyValues = fmtpLine.substring(spacePos + 1).split('; ');

    let pattern = new RegExp('a=fmtp:(\\d+)');
    let result = fmtpLine.match(pattern);
    if (result && result.length === 2) {
        fmtpObj.pt = result[1];
    } else {
        return fmtpObj;
    }

    for (let i = 0; i < keyValues.length; ++i) {
        let pair = keyValues[i].split('=');
        if (pair.length === 2) {
            fmtpObj.params[pair[0]] = pair[1];
        }
    }

    return fmtpObj;
};

// Generate an fmtp line from an object including 'pt' and 'params'.
export const writeFmtpLine = (fmtpObj: FTMP) => {
    if (!fmtpObj.hasOwnProperty('pt') || !fmtpObj.hasOwnProperty('params')) {
        return "";
    }
    let pt = fmtpObj.pt;
    let params = fmtpObj.params;
    let keyValues = [];
    let i = 0;
    for (let key in params) {
        keyValues[i] = key + '=' + params[key];
        ++i;
    }
    if (i === 0) {
        return "";
    }
    return 'a=fmtp:' + pt.toString() + ' ' + keyValues.join('; ');
};

// Find fmtp attribute for |codec| in |sdpLines|.
export const findFmtpLine = (sdpLines: string[], codec: string) => {
    // Find payload of codec.
    let payload = getCodecPayloadType(sdpLines, codec);
    // Find the payload in fmtp line.
    return payload ? findLine(sdpLines, 'a=fmtp:' + payload.toString()) : null;
};

// Find the line in sdpLines that starts with |prefix|, and, if specified,
// contains |substr| (case-insensitive search).
export const findLine = (sdpLines: string[], prefix: string, substr = "") => {
    return findLineInRange(sdpLines, 0, -1, prefix, substr);
};

// Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
// and, if specified, contains |substr| (case-insensitive search).
export const findLineInRange = (sdpLines: string[], startLine: number, endLine: number, prefix: string, substr = "") => {
    let realEndLine = endLine !== -1 ? endLine : sdpLines.length;
    for (let i = startLine; i < realEndLine; ++i) {
        if (sdpLines[i].indexOf(prefix) === 0) {
            if (!substr ||
                sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
                return i;
            }
        }
    }
    return null;
};

// Gets the codec payload type from sdp lines.
export const getCodecPayloadType = (sdpLines: string[], codec: string) => {
    let index = findLine(sdpLines, 'a=rtpmap', codec);
    return index ? getCodecPayloadTypeFromLine(sdpLines[index]) : null;
};

// Gets the codec payload type from an a=rtpmap:X line.
export const getCodecPayloadTypeFromLine = (sdpLine: string) => {
    let pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
    let result = sdpLine.match(pattern);
    return (result && result.length === 2) ? result[1] : "";
};

// Returns a new m= line with the specified codec as the first one.
export const setDefaultCodec = (mLine: string, payload: string) => {
    let elements = mLine.split(' ');

    // Just copy the first three parameters; codec order starts on fourth.
    let newLine = elements.slice(0, 3);

    // Put target payload first and copy in the rest.
    newLine.push(payload);
    for (let i = 3; i < elements.length; i++) {
        if (elements[i] !== payload) {
            newLine.push(elements[i]);
        }
    }
    return newLine.join(' ');
};

export const setMaxAverageBitrate = (sdp: string, bitrate = 510000) => {
    return sdp.replace('useinbandfec=1', `useinbandfec=1; stereo=1; maxaveragebitrate=${bitrate}`);
};