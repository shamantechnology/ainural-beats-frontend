
import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, Vector3 } from '@react-three/fiber'
import { OrbitControls, Text, PerspectiveCamera } from '@react-three/drei';
import { createNoise2D, createNoise3D } from 'simplex-noise';

import "./App.css";
import sleepAudio from "./sleep_test2.wav"
import relaxAudio from "./relax_test.wav"
import meditateAudio from "./meditate_test2.wav"


// -- math functions -- //
function fractionate(val, minVal, maxVal) {
  return (val - minVal) / (maxVal - minVal);
}

function modulate(val, minVal, maxVal, outMin, outMax) {
  let fr = fractionate(val, minVal, maxVal);
  let delta = outMax - outMin;
  return outMin + (fr * delta);
}

function avg(arr) {
  let total = arr.reduce(function (sum, b) { return sum + b; });
  return (total / arr.length);
}

function max(arr) {
  return arr.reduce(function (a, b) { return Math.max(a, b); })
}

// App
// component that runs the 3D vizualizer interface
function App() {
  // camera position
  const camPosition = [
    75,
    0,
    0,
    6.8];

  // simplex noise
  const noise3D = createNoise3D();
  const noise2D = createNoise2D();

  // audio source and context
  const [audio, setAudio] = useState(null);
  const [audioClone, setAudioClone] = useState(null);
  const [source, setSource] = useState(null);
  const [audioContext, setAudioContext] = useState(null);
  const [dataArray, setDataArray] = useState(null);
  const [analyser, setAnalyser] = useState(null);

  // -- audio functions -- //
  
  // play
  // beat - path to wave file
  // play a static wave file in the types Sleep, Relax, Meditate
  // selected by user. Will seek to upgrade to via API with 
  // live ML generation
  function play(beat) {
    // set up audio vars
    let ad = document.getElementById("audio");
    ad.src = beat;
    ad.play();
    setAudio(ad);

    // Create a new HTMLMediaElement instance
    // might be creating a memory issue where there is multiple
    // media element, adding to useState to remove the old one
    if(audioClone !== null) {
      audioClone = null;
      setAudioClone(audioClone);
    } 

    let newAd = ad.cloneNode(true);
    setAudioClone(newAd);

    let context = new AudioContext();
    let src = context.createMediaElementSource(newAd);
    setSource(src);
    setAudioContext(context);

    if (context.state === "running") {
      let al = context.createAnalyser();
      al.connect(context.destination);
      al.fftSize = 512;
      src.connect(al);
      setAnalyser(al);
    }
  }

  // -- scene functions -- //

  // Box
  // creates a box with mesh
  function Box(props) {
    // This reference gives us direct access to the THREE.Mesh object
    const ref = useRef();

    // Hold state for hovered and clicked events
    const [hovered, hover] = useState(false);
    const [clicked, click] = useState(false);

    // Return the view, these are regular Threejs elements expressed in JSX
    // args are width, height and depth of the box
    return (
      <mesh
        {...props}
        ref={ref}
        onClick={() => {
          click(!clicked);

          if(props.name === "Relax") {
            play(relaxAudio);
          } else if(props.name === "Meditate") {
            play(meditateAudio);
          } else if(props.name === "Sleep") {
            play(sleepAudio);
          }
        }}
        onPointerOver={() => hover(true)}
        onPointerOut={() => hover(false)}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={hovered ? 0x92B780 : 0xffffff} opacity={0.6} transparent />
      </mesh>
    );
  }

  // TextOnBox
  // creates a box object with text
  function TextOnBox({ position, text }) {
    const textPosition = [position[0], position[1], position[2] + 0.6];

    return (
      <>
        <Box position={position} name={text} />
        <Text position={textPosition} fontSize={0.2} lineHeight={0.02}>
          {text}
        </Text>
      </>
    );
  }

  // Icosahedron
  // create an icosahedron
  // update to animate with the music
  function Icosahedron(props) {
    // This mesh reference gives us direct access to the THREE.Mesh object
    const ref = useRef();

    // animation rendering
    useFrame((state, delta, xrFrame) => {
      const cmesh = ref.current;
      const cgeo = cmesh.geometry;
      const cpos = cgeo.attributes.position;

      if (ref.current && !analyser) {
        ref.current.rotation.y += 0.005;
      }

      if(analyser && ref.current) {
        // frequency data of wav that is playing for animation
        // capture the trebel and bass
        let bufferLength = analyser.frequencyBinCount;
        let da = new Uint8Array(bufferLength);

        analyser.getByteFrequencyData(da);

        let lowerHalfArray = da.slice(0, (da.length / 2) - 1);
        let lowerMax = max(lowerHalfArray);
        let lowerMaxFr = lowerMax / lowerHalfArray.length;

        let upperHalfArray = da.slice((da.length / 2) - 1, da.length - 1);
        let upperAvg = avg(upperHalfArray);
        let upperAvgFr = upperAvg / upperHalfArray.length;

        // create patterns on the icoshedron mesh in 3D with the bass and trebel frequencies
        let bassFr = modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0.5, 8);
        let treFr = modulate(upperAvgFr, 0, 1, 0.5, 4);

        for (let i = 0; i < cpos.count; i++) {
          let vx = cpos.getX(i);
          let vy = cpos.getY(i);
          let vz = cpos.getZ(i);

          let offset = cmesh.geometry.parameters.radius;
          let amp = 1;
          let time = window.performance.now();
          let rf = 0.00001;

          // Calculate the length of the vector
          let vectorLength = Math.sqrt(vx * vx + vy * vy + vz * vz);

          // Normalize the vector by dividing each component by its length
          vx /= vectorLength;
          vy /= vectorLength;
          vz /= vectorLength;

          let noise_x = vx + time * rf * 7;
          let noise_y = vy + time * rf * 8;
          let noise_z = vz + time * rf * 9;

          let distance = offset;
          distance += bassFr;
          distance += noise3D(noise_x, noise_y, noise_z) * amp * treFr;

          // Multiply the vector components by the scalar distance
          vx *= distance;
          vy *= distance;
          vz *= distance;

          // Update the vertex position with the new scaled vector
          cpos.setXYZ(i, vx, vy, vz);
        }

        cpos.needsUpdate = true;
      }
    });

    // Return the view, these are regular Threejs elements expressed in JSX
    return (
      <mesh
        {...props}
        ref={ref}>
        <icosahedronGeometry args={[2, 5]} />
        <meshLambertMaterial attach="material" color={0xf0c420} wireframe={true} />
      </mesh>
    )
  }

  // create a background wireframe
  function WireframePlane(props) {
    const ref = useRef();

    // animation rendering
    useFrame((state, delta, xrFrame) => {
      const cmesh = ref.current;
      const cgeo = cmesh.geometry;
      const cpos = cgeo.attributes.position;

      // frequency data of wav that is playing for animation
      // captures the bass
      if(analyser && ref.current) {
        let bufferLength = analyser.frequencyBinCount;
        let da = new Uint8Array(bufferLength);

        analyser.getByteFrequencyData(da);

        let upperHalfArray = da.slice((da.length / 2) - 1, da.length - 1);
        let upperAvg = avg(upperHalfArray);
        let upperAvgFr = upperAvg / upperHalfArray.length;

        // create patterns on the plane mesh in 2D with the bass frequencies
        let distortFr = modulate(upperAvgFr, 0, 1, 0.5, 4);

        for (let i = 0; i < cpos.count; i++) {
          let vx = cpos.getX(i);
          let vy = cpos.getY(i);

          let amp = 0.8;
          let time = Date.now();
  
          let noise_x = vx + time * 0.0003;
          let noise_y = vy + time * 0.0001;
          let distance = (noise2D(noise_x, noise_y) + 0) * distortFr * amp;
          let vz = distance;
          
          //console.log(vx, vy, vz);
          cpos.setXYZ(i, vx, vy, vz);
        }
        
        cpos.needsUpdate = true;
      }
    });

    return (
      <mesh {...props}
      ref={ref}
      rotation={[0, 0, 0]} 
      position={[0, -1, -3]} 
      receiveShadow>
        <planeGeometry args={[30, 30, 100, 100]} />
        <meshBasicMaterial wireframe color={0x6904ce} opacity={0.3} transparent />
      </mesh>
    );
  }

  return (
    <>
      <audio id="audio" controls="" loop></audio>
      <Canvas>
        <OrbitControls />
        <PerspectiveCamera makeDefault position={[
          camPosition[1],
          camPosition[2],
          camPosition[3]]} fov={camPosition[0]} />
        <ambientLight />
        <pointLight position={[10, 10, 10]} />

        <WireframePlane />

        <TextOnBox position={[-1.5, 2.5, 0]} text="Relax" audio={audio} />
        <TextOnBox position={[0, 2.5, 0]} text="Meditate" audio={audio} />
        <TextOnBox position={[1.5, 2.5, 0]} text="Sleep" audio={audio} />

        <Icosahedron position={[0, -1.1, 0]} />
      </Canvas>
    </>
  );
}

export default App;
