import React, { useRef, useState} from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text, PerspectiveCamera } from '@react-three/drei';

import "./App.css";

function App() {
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
        onClick={() => click(!clicked)}
        onPointerOver={() => hover(true)}
        onPointerOut={() => hover(false)}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={0xffffff} opacity={0.6} transparent/>
      </mesh>
    );
  }

  function TextOnBox({ position, text }) {
    const textPosition = [position[0], position[1], position[2] + 0.6];
    
    return (
      <>
        <Box position={position} />
        <Text position={textPosition} fontSize={0.2} lineHeight={0.02}>
          {text}
        </Text>
      </>
    );
  }

  // create an icosahedron
  // update to animate with the music
  function Icosahedron(props) {
    // This reference gives us direct access to the THREE.Mesh object
    const ref = useRef();
    useFrame(() => {
      if (ref.current) {
        ref.current.rotation.y += 0.005;
      }
    });

    // Return the view, these are regular Threejs elements expressed in JSX
    return (
      <mesh
        {...props}
        ref={ref}>
        <icosahedronGeometry args={[2.5, 5]} />
        <meshLambertMaterial attach="material" color={0xf0c420} wireframe={true} />
      </mesh>
    )
  }

  // create a background wireframe
  function WireframePlane() {
    return (
      <mesh rotation={[0, 0, 0]} position={[0, -1, -3]} receiveShadow>
        <planeGeometry args={[30, 30, 100, 100]} />
        <meshBasicMaterial wireframe color={0x6904ce} opacity={0.3} transparent />
      </mesh>
    );
  }

  // camera position
  const camPosition = [
    75, 
    0,
    0,
    6.8];

  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[
      camPosition[1],
      camPosition[2],
      camPosition[3]]} fov={camPosition[0]} />
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      
      <WireframePlane />

      <TextOnBox position={[-1.5, 2.5, 0]} text="Relax" />
      <TextOnBox position={[0, 2.5, 0]} text="Meditate" />
      <TextOnBox position={[1.5, 2.5, 0]} text="Sleep" />

      <Icosahedron position={[0, -1, 0]} />
    </Canvas>
  );
}

export default App;
