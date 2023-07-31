import { useEffect, useRef, useState } from "react";

const Amp = () => {
  const volumeRef = useRef();
  const bassRef = useRef();
  const midRef = useRef();
  const trebleRef = useRef();
  const visualizerRef = useRef();
  const analyserNodeRef = useRef();
  const gainNodeRef = useRef();
  const bassEQRef = useRef();
  const midEQRef = useRef();
  const trebleEQRef = useRef();
  const context = new AudioContext();
  const animationFrameRef = useRef();
  const [nodesReady, setNodesReady] = useState(false);

  useEffect(() => {
    setupEventListeners();
    setupContext();
    resize();
  }, []);

  useEffect(() => {
    if (nodesReady) {
      animationFrameRef.current = requestAnimationFrame(drawVisualizer);
    }
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [nodesReady]);

  function resetButton() {
    const rangeInputs = [volumeRef, bassRef, midRef, trebleRef];
    if (nodesReady) {
      rangeInputs.forEach((inputRef) => {
        if (inputRef.current) {
          const input = inputRef.current;
          const defaultValue = input.defaultValue;
          input.value = defaultValue;
          const event = new Event("input", { bubbles: true });
          input.dispatchEvent(event);
        }
      });
    }
  }

  function setupEventListeners() {
    volumeRef.current.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      gainNodeRef.current.gain.setTargetAtTime(
        value,
        context.currentTime,
        0.01
      );
    });

    bassRef.current.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      bassEQRef.current.gain.setTargetAtTime(value, context.currentTime, 0.01);
    });

    midRef.current.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      midEQRef.current.gain.setTargetAtTime(value, context.currentTime, 0.01);
    });

    trebleRef.current.addEventListener("input", (e) => {
      const value = parseInt(e.target.value);
      trebleEQRef.current.gain.setTargetAtTime(
        value,
        context.currentTime,
        0.01
      );
    });
  }

  async function setupContext() {
    try {
      const guitar = await getGuitar();
      if (context.state === "suspended") {
        await context.resume();
      }

      const source = context.createMediaStreamSource(guitar);
      analyserNodeRef.current = new AnalyserNode(context, { fftSize: 256 });
      gainNodeRef.current = new GainNode(context, {
        gain: volumeRef.current.value,
      });
      bassEQRef.current = new BiquadFilterNode(context, {
        type: "lowshelf",
        frequency: 500,
        gain: bassRef.current.value,
        Q: 1.0,
      });
      midEQRef.current = new BiquadFilterNode(context, {
        type: "peaking",
        Q: Math.SQRT1_2,
        frequency: 1500,
        gain: midRef.current.value,
      });
      trebleEQRef.current = new BiquadFilterNode(context, {
        type: "highshelf",
        frequency: 3000,
        gain: trebleRef.current.value,
      });

      source
        .connect(bassEQRef.current)
        .connect(midEQRef.current)
        .connect(trebleEQRef.current)
        .connect(gainNodeRef.current)
        .connect(analyserNodeRef.current)
        .connect(context.destination);

      setNodesReady(true);
    } catch (error) {
      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        alert(
          "Microphone access was denied. Microphone access is needed to use AMP Controls."
        );
      }
    }
  }

  async function getGuitar() {
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
        latency: 0,
      },
    });
  }
  function drawVisualizer() {
    requestAnimationFrame(drawVisualizer);

    const bufferLength = analyserNodeRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNodeRef.current.getByteFrequencyData(dataArray);

    const width = visualizerRef.current.width;
    const height = visualizerRef.current.height;
    const barWidth = width / bufferLength;

    const canvasContext = visualizerRef.current.getContext("2d");
    canvasContext.clearRect(0, 0, width, height);

    dataArray.forEach((item, index) => {
      const y = (item / 255) * (height / 2);
      const x = barWidth * index;

      canvasContext.fillStyle = `hsl(${(y / height) * 400}, 100%, 50%)`;
      canvasContext.fillRect(x, height - y, barWidth, y);
    });
  }
  function resize() {
    visualizerRef.current.width =
      visualizerRef.current.clientWidth * window.devicePixelRatio;
    visualizerRef.current.height =
      visualizerRef.current.clientHeight * window.devicePixelRatio;
  }
  return (
    <div className="Amp-wrapper">
      <div className="AMP-card">
        <div className="heading">
          <h1>AMP Controls</h1>
        </div>
        <div className="grid">
          <button onClick={resetButton}>
            <label htmlFor="volume">Volume</label>
          </button>
          <input
            type="range"
            min="0"
            max="1"
            defaultValue=".5"
            step=".01"
            id="volume"
            ref={volumeRef}
            disabled={!nodesReady}
            enabled={nodesReady ? "true" : undefined}
          />
          <button onClick={resetButton}>
            <label htmlFor="bass">Bass</label>
          </button>
          <input
            type="range"
            min="-10"
            max="10"
            defaultValue="0"
            id="bass"
            ref={bassRef}
            disabled={!nodesReady}
            enabled={nodesReady ? "true" : undefined}
          />
          <button onClick={resetButton}>
            <label htmlFor="mid">Mid</label>
          </button>
          <input
            type="range"
            min="-10"
            max="10"
            defaultValue="0"
            id="mid"
            ref={midRef}
            disabled={!nodesReady}
            enabled={nodesReady ? "true" : undefined}
          />
          <button onClick={resetButton}>
            <label htmlFor="treble">Treble</label>
          </button>
          <input
            type="range"
            min="-10"
            max="10"
            defaultValue="0"
            id="treble"
            ref={trebleRef}
            disabled={!nodesReady}
            enabled={nodesReady ? "true" : undefined}
          />
        </div>
      </div>
      <canvas id="visualizer" ref={visualizerRef}></canvas>
    </div>
  );
};

export default Amp;
