import { useEffect } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";

const tileSize = 256;
const blockSize = 128;
const streetWidth = 10;

const neighborhoods = [
  { name: "ΚΥΨΕΛΗ", latitude: 37.993, longitude: 23.7344 },
  { name: "ΕΞΑΡΧΕΙΑ", latitude: 37.9861, longitude: 23.7348 },
  { name: "ΚΟΛΩΝΑΚΙ", latitude: 37.9799, longitude: 23.7408 },
  { name: "ΣΥΝΤΑΓΜΑ", latitude: 37.9755, longitude: 23.7348 },
  { name: "ΜΟΝΑΣΤΗΡΑΚΙ", latitude: 37.9763, longitude: 23.7255 },
  { name: "ΠΛΑΚΑ", latitude: 37.9725, longitude: 23.7308 },
  { name: "ΘΗΣΕΙΟ", latitude: 37.9764, longitude: 23.7209 },
  { name: "ΠΑΓΚΡΑΤΙ", latitude: 37.9679, longitude: 23.7448 },
  { name: "ΚΟΥΚΑΚΙ", latitude: 37.9645, longitude: 23.7275 },
  { name: "ΑΜΠΕΛΟΚΗΠΟΙ", latitude: 37.9901, longitude: 23.7545 },
];

const buildingColors = ["#ded8ca", "#e7dfd1", "#d9d8cd", "#e5d9ce", "#d8d7ce"];

function getBlockRandom(x, y, building) {
  let value = Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(building, 83492791);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

function drawTile(canvas, coordinates) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const scale = 2 ** (coordinates.z - 13);
  const scaledBlockSize = blockSize * scale;
  const originX = coordinates.x * tileSize;
  const originY = coordinates.y * tileSize;
  const minBlockX = Math.floor(originX / scaledBlockSize) - 1;
  const maxBlockX = Math.ceil((originX + tileSize) / scaledBlockSize);
  const minBlockY = Math.floor(originY / scaledBlockSize) - 1;
  const maxBlockY = Math.ceil((originY + tileSize) / scaledBlockSize);

  canvas.width = tileSize;
  canvas.height = tileSize;
  context.fillStyle = "#f3f0e8";
  context.fillRect(0, 0, tileSize, tileSize);
  context.save();
  context.translate(-originX, -originY);

  for (let blockX = minBlockX; blockX <= maxBlockX; blockX += 1) {
    for (let blockY = minBlockY; blockY <= maxBlockY; blockY += 1) {
      const x = blockX * scaledBlockSize;
      const y = blockY * scaledBlockSize;
      const verticalStreet = blockX % 8 === 0 ? 23 * scale : streetWidth * scale;
      const horizontalStreet = blockY % 8 === 0 ? 23 * scale : streetWidth * scale;
      const inset = 4 * scale;
      const availableWidth = scaledBlockSize - verticalStreet - inset * 2;
      const availableHeight = scaledBlockSize - horizontalStreet - inset * 2;
      const isPark = getBlockRandom(blockX, blockY, 500) < 0.045;

      if (isPark) {
        const parkX = x + verticalStreet + inset;
        const parkY = y + horizontalStreet + inset;
        context.fillStyle = "#dce8d1";
        context.fillRect(parkX, parkY, availableWidth, availableHeight);

        const treeCount = 8;
        for (let tree = 0; tree < treeCount; tree += 1) {
          const treeX = parkX + getBlockRandom(blockX, blockY, tree * 2 + 1) * availableWidth;
          const treeY = parkY + getBlockRandom(blockX, blockY, tree * 2 + 2) * availableHeight;
          context.beginPath();
          context.arc(treeX, treeY, Math.max(1.5, 2.4 * scale), 0, Math.PI * 2);
          context.fillStyle = tree % 2 === 0 ? "#9db88c" : "#b2c69e";
          context.fill();
        }
        continue;
      }

      const columns = 4;
      const rows = 4;
      const parcelWidth = availableWidth / columns;
      const parcelHeight = availableHeight / rows;

      for (let column = 0; column < columns; column += 1) {
        for (let row = 0; row < rows; row += 1) {
          const seed = column * rows + row;
          const paddingX = (2.5 + getBlockRandom(blockX, blockY, seed + 1) * 2) * scale;
          const paddingY = (2.5 + getBlockRandom(blockX, blockY, seed + 21) * 2) * scale;
          const buildingX = x + verticalStreet + inset + column * parcelWidth + paddingX;
          const buildingY = y + horizontalStreet + inset + row * parcelHeight + paddingY;
          const buildingWidth = Math.max(1, parcelWidth - paddingX * 2);
          const buildingHeight = Math.max(1, parcelHeight - paddingY * 2);

          context.fillStyle = buildingColors[Math.floor(getBlockRandom(blockX, blockY, seed + 41) * buildingColors.length)];
          context.fillRect(buildingX, buildingY, buildingWidth, buildingHeight);
          context.strokeStyle = "#d0c8b9";
          context.lineWidth = Math.max(0.5, 0.75 * scale);
          context.strokeRect(buildingX, buildingY, buildingWidth, buildingHeight);
        }
      }
    }
  }

  for (let blockX = minBlockX; blockX <= maxBlockX + 1; blockX += 1) {
    const roadX = blockX * scaledBlockSize;
    const width = (blockX % 8 === 0 ? 23 : streetWidth) * scale;
    context.fillStyle = blockX % 8 === 0 ? "#e8dfd0" : "#eae6dc";
    context.fillRect(roadX, originY - 1, width, tileSize + 2);

    if (blockX % 8 === 0) {
      context.strokeStyle = "#f9f5ed";
      context.lineWidth = Math.max(1, scale);
      context.beginPath();
      context.moveTo(roadX + width / 2, originY - 1);
      context.lineTo(roadX + width / 2, originY + tileSize + 1);
      context.stroke();
    }
  }

  for (let blockY = minBlockY; blockY <= maxBlockY + 1; blockY += 1) {
    const roadY = blockY * scaledBlockSize;
    const width = (blockY % 8 === 0 ? 23 : streetWidth) * scale;
    context.fillStyle = blockY % 8 === 0 ? "#e8dfd0" : "#eae6dc";
    context.fillRect(originX - 1, roadY, tileSize + 2, width);

    if (blockY % 8 === 0) {
      context.strokeStyle = "#f9f5ed";
      context.lineWidth = Math.max(1, scale);
      context.beginPath();
      context.moveTo(originX - 1, roadY + width / 2);
      context.lineTo(originX + tileSize + 1, roadY + width / 2);
      context.stroke();
    }
  }

  context.restore();

  context.font = "600 10px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineWidth = 3;
  context.strokeStyle = "rgba(243, 240, 232, 0.9)";
  context.fillStyle = "#928b7c";

  for (const neighborhood of neighborhoods) {
    const point = L.CRS.EPSG3857.latLngToPoint(
      [neighborhood.latitude, neighborhood.longitude],
      coordinates.z,
    );
    const x = point.x - originX;
    const y = point.y - originY;
    if (x < -90 || x > tileSize + 90 || y < -16 || y > tileSize + 16) continue;

    context.strokeText(neighborhood.name, x, y);
    context.fillText(neighborhood.name, x, y);
  }
}

export default function ImaginaryMapLayer() {
  const map = useMap();

  useEffect(() => {
    const layer = L.gridLayer({
      keepBuffer: 2,
      tileSize,
      updateWhenZooming: false,
    });

    layer.createTile = (coordinates, done) => {
      const canvas = document.createElement("canvas");
      drawTile(canvas, coordinates);
      done(null, canvas);
      return canvas;
    };

    layer.addTo(map);
    return () => layer.remove();
  }, [map]);

  return null;
}
