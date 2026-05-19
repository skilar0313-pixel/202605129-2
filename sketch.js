let capture;
let hands;
let predictions = [];
let gameState = 'READY'; // READY, COUNTDOWN, RESULT, MENU
let timer = 0;
let playerHand = 'None';
let computerHand = '';
let resultMsg = '';

const GESTURES = {
  ROCK: '石頭',
  PAPER: '布',
  SCISSORS: '剪刀',
  CONTINUE: '愛心(繼續)',
  END: '食指(結束)',
  UNKNOWN: '未知'
};

function setup() {
  createCanvas(640, 480);
  // 初始化相機
  capture = createCapture(VIDEO, () => {
    console.log("Camera ready");
  });
  capture.size(640, 480);
  capture.hide();

  hands = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });

  hands.onResults(onResults);

  const camera = new Camera(capture.elt, {
    onFrame: async () => {
      await hands.send({ image: capture.elt });
    },
    width: 640,
    height: 480
  });
  camera.start();
}

function onResults(results) {
  predictions = results.multiHandLandmarks;
}

// 手勢辨識邏輯
function classifyHand(landmarks) {
  // 判斷手指是否伸直 (y 座標越小代表越高)
  const isExtended = (tip, pip) => landmarks[tip].y < landmarks[pip].y;

  const indexExtended = isExtended(8, 6);
  const middleExtended = isExtended(12, 10);
  const ringExtended = isExtended(16, 14);
  const pinkyExtended = isExtended(20, 18);

  // 1. 布：四指全開
  if (indexExtended && middleExtended && ringExtended && pinkyExtended) return GESTURES.PAPER;
  
  // 2. 剪刀：食指中指開，其餘收
  if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) return GESTURES.SCISSORS;

  // 3. 只有食指：比 1 (結束遊戲)
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    // 檢查拇指是否靠近食指尖，避免跟愛心搞混
    let d = dist(landmarks[4].x, landmarks[4].y, landmarks[8].x, landmarks[8].y);
    if (d > 0.1) return GESTURES.END;
  }

  // 4. 石頭或愛心
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    // 檢查拇指尖(4)與食指尖(8)距離 (模擬韓式小愛心)
    let d = dist(landmarks[4].x, landmarks[4].y, landmarks[8].x, landmarks[8].y);
    if (d < 0.05) return GESTURES.CONTINUE;
    return GESTURES.ROCK;
  }

  return GESTURES.UNKNOWN;
}

function draw() {
  // 鏡像畫面
  push();
  translate(width, 0);
  scale(-1, 1);
  image(capture, 0, 0, width, height);
  
  // 取得玩家手勢
  if (predictions && predictions.length > 0) {
    playerHand = classifyHand(predictions[0]);
    // 畫出關節點輔助
    fill(0, 255, 0);
    for (let p of predictions[0]) {
      ellipse(p.x * width, p.y * height, 5, 5);
    }
  } else {
    playerHand = 'None';
  }
  pop();

  // 遊戲畫面 UI
  textAlign(CENTER, CENTER);
  
  if (gameState === 'READY') {
    fill(0, 150); rect(100, 180, 440, 100, 20);
    fill(255); textSize(40);
    text("請出拳 (石頭/剪刀/布)", width/2, height/2);
    if (playerHand === GESTURES.ROCK || playerHand === GESTURES.PAPER || playerHand === GESTURES.SCISSORS) {
      gameState = 'COUNTDOWN';
      timer = frameCount;
    }
  } 
  else if (gameState === 'COUNTDOWN') {
    let count = 3 - floor((frameCount - timer) / 60);
    fill(255, 0, 0); textSize(100);
    text(count > 0 ? count : "出！", width/2, height/2);
    if (count < 0) {
      computerHand = random([GESTURES.ROCK, GESTURES.PAPER, GESTURES.SCISSORS]);
      gameState = 'RESULT';
      timer = frameCount;
    }
  }
  else if (gameState === 'RESULT') {
    textSize(40); fill(255);
    text(`你：${playerHand}  VS  電腦：${computerHand}`, width/2, height/2 - 50);
    
    // 判定勝負
    if (playerHand === computerHand) resultMsg = "平手！";
    else if (
      (playerHand === GESTURES.ROCK && computerHand === GESTURES.SCISSORS) ||
      (playerHand === GESTURES.PAPER && computerHand === GESTURES.ROCK) ||
      (playerHand === GESTURES.SCISSORS && computerHand === GESTURES.PAPER)
    ) resultMsg = "你贏了！🎉";
    else resultMsg = "你輸了...💀";

    textSize(60); fill(255, 255, 0);
    text(resultMsg, width/2, height/2 + 50);
    if ((frameCount - timer) > 120) gameState = 'MENU';
  }
  else if (gameState === 'MENU') {
    fill(0, 200); rect(0, 0, width, height);
    fill(255); textSize(32);
    text("選單", width/2, height/2 - 100);
    textSize(24);
    text("繼續遊玩：請比「愛心手勢 ❤️」", width/2, height/2 - 20);
    text("結束遊戲：請比「食指 ☝️」", width/2, height/2 + 30);
    
    fill(0, 255, 0);
    text(`目前偵測：${playerHand}`, width/2, height/2 + 100);

    if (playerHand === GESTURES.CONTINUE) {
      gameState = 'READY';
    } else if (playerHand === GESTURES.END) {
      gameState = 'EXIT';
    }
  }
  else if (gameState === 'EXIT') {
    background(0);
    fill(255); textSize(40);
    text("遊戲已結束", width/2, height/2);
    noLoop();
  }
}
