const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");

canvasElement.width = 640;
canvasElement.height = 480;

let isDrawing = false;
let isErasing = false;
let lastX = null;
let lastY = null;

const drawLayer = document.createElement("canvas");
drawLayer.width = canvasElement.width;
drawLayer.height = canvasElement.height;
const drawCtx = drawLayer.getContext("2d");

function isFist(landmarks) {
  return (
    landmarks[8].y > landmarks[6].y &&
    landmarks[12].y > landmarks[10].y &&
    landmarks[16].y > landmarks[14].y &&
    landmarks[20].y > landmarks[18].y
  );
}

function fingerFolded(landmarks, tip, pip) {
  return landmarks[tip].y > landmarks[pip].y;
}

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.5,
});

hands.onResults((results) => {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.translate(canvasElement.width, 0);
  canvasCtx.scale(-1, 1);
  canvasCtx.drawImage(
    results.image,
    0,
    0,
    canvasElement.width,
    canvasElement.height
  );
  canvasCtx.drawImage(drawLayer, 0, 0);

  const hand = results.multiHandLandmarks[0];

  if (hand) {
    const isPointing =
      !fingerFolded(hand, 8, 6) &&
      fingerFolded(hand, 12, 10) &&
      fingerFolded(hand, 16, 14) &&
      fingerFolded(hand, 20, 18);

    isErasing = isFist(hand);
    isDrawing = isPointing && !isErasing;

    const indexTip = hand[8];
    const x = canvasElement.width * indexTip.x;
    const y = canvasElement.height * indexTip.y;
    const radius = 40;

    if (isDrawing) {
      drawCtx.beginPath();
      drawCtx.globalCompositeOperation = "source-over";
      drawCtx.strokeStyle = "#00f";
      drawCtx.lineWidth = 4;
      if (lastX !== null && lastY !== null) {
        drawCtx.moveTo(lastX, lastY);
        drawCtx.lineTo(x, y);
        drawCtx.stroke();
      }
      lastX = x;
      lastY = y;

      // Glowing index tip
      canvasCtx.save();
      canvasCtx.shadowColor = "deepskyblue";
      canvasCtx.shadowBlur = 20;
      canvasCtx.beginPath();
      canvasCtx.arc(x, y, 8, 0, 2 * Math.PI);
      canvasCtx.fillStyle = "dodgerblue";
      canvasCtx.fill();
      canvasCtx.restore();
    } else if (isErasing) {
      drawCtx.globalCompositeOperation = "destination-out";
      drawCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    } else {
      lastX = null;
      lastY = null;
    }

    drawConnectors(canvasCtx, hand, HAND_CONNECTIONS, {
      color: "rgba(0, 255, 255, 0.5)", // lighter cyan with 50% opacity
      lineWidth: 2,
    });

    hand.forEach((landmark, i) => {
      const px = canvasElement.width * landmark.x;
      const py = canvasElement.height * landmark.y;
      canvasCtx.beginPath();
      canvasCtx.arc(px, py, 4, 0, 2 * Math.PI);
      if (i === 8 && isDrawing) {
        canvasCtx.shadowColor = "#00ffff"; // Cyan glow
        canvasCtx.shadowBlur = 15;
        canvasCtx.fillStyle = "#ffffff"; // White center
        canvasCtx.beginPath();
        canvasCtx.arc(px, py, 6, 0, 2 * Math.PI);
        canvasCtx.fill();
        canvasCtx.shadowBlur = 0;
      } else {
        canvasCtx.fillStyle = "rgba(0, 255, 255, 0.5)"; // lighter cyan with less opacity
        canvasCtx.fill();
      }
    });

    // Custom styled square eraser - Iron Man theme with reduced glow
    if (isErasing) {
      const size = radius * 2;
      canvasCtx.save();
      canvasCtx.shadowColor = "#00faff"; // Arc Reactor Blue glow
      canvasCtx.shadowBlur = 8; // Reduced glow from 20 → 8
      canvasCtx.fillStyle = "#001f2d"; // Deep tech blue
      canvasCtx.strokeStyle = "#00faff"; // Neon border
      canvasCtx.lineWidth = 2;
      canvasCtx.fillRect(x - radius, y - radius, size, size);
      canvasCtx.strokeRect(x - radius, y - radius, size, size);
      canvasCtx.restore();
    }
  }

  const previewCanvas = document.getElementById("preview");
  const previewCtx = previewCanvas.getContext("2d");
  previewCtx.save();
  previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  previewCtx.translate(previewCanvas.width, 0);
  previewCtx.scale(-1, 1);

  // Set all strokes to white regardless of original color
  previewCtx.drawImage(drawLayer, 0, 0);

  // OVERLAY white version
  previewCtx.globalCompositeOperation = "source-in";
  previewCtx.fillStyle = "#ffffff"; // make all drawn content white
  previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

  previewCtx.restore();

  canvasCtx.restore();
});

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});
camera.start();

document.getElementById("saveBtn").addEventListener("click", () => {
  const previewCanvas = document.getElementById("preview");

  // Create a temporary canvas to flatten the result
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = previewCanvas.width;
  tempCanvas.height = previewCanvas.height;
  const tempCtx = tempCanvas.getContext("2d");

  // Fill background with black
  tempCtx.fillStyle = "#000000";
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  // Draw preview canvas (already contains white strokes)
  tempCtx.drawImage(previewCanvas, 0, 0);

  // Save as PNG
  const link = document.createElement("a");
  link.download = "drawtica_output.png";
  link.href = tempCanvas.toDataURL("image/png");
  link.click();
});
