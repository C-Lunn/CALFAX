import { isMobile } from 'react-device-detect';
import './App.css';
import Terminal from './Terminal';
import { useEffect } from 'react';

import  './wasm/wasm_exec.js';
import './wasm/wasm_types.d.ts';

function App() {    
    const handleButtonPress = (num: number) => () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: num.toString() }));
    }
    if (isMobile) {
        return ( <div className="tv-root-mobile">
                    <div className="tv-mobile">
                        <div className="tv-mobile-top" />
                        <div className="canvas-holder-mobile">
                            <Terminal canvas_id="term-canvas-mobile" holder_id="terminal-mobile" mobile />
                        </div>
                        <img src="portabletelevision.png" alt="tv" className="tv-img-mobile" />
                        <div className="tv-mobile-bottom">
                            <div className="tv-mobile-buttons">
                                <div onClick={handleButtonPress(1)} className="tv-mobile-button tv-mobile-button-1">1</div>
                                <div onClick={handleButtonPress(2)} className="tv-mobile-button tv-mobile-button-2">2</div>
                                <div onClick={handleButtonPress(3)} className="tv-mobile-button tv-mobile-button-3">3</div>
                                <div onClick={handleButtonPress(4)} className="tv-mobile-button tv-mobile-button-4">4</div>
                                <div onClick={handleButtonPress(5)} className="tv-mobile-button tv-mobile-button-5">5</div>
                                <div onClick={handleButtonPress(6)} className="tv-mobile-button tv-mobile-button-6">6</div>
                                <div onClick={handleButtonPress(7)} className="tv-mobile-button tv-mobile-button-7">7</div>
                                <div onClick={handleButtonPress(8)} className="tv-mobile-button tv-mobile-button-8">8</div>
                                <div onClick={handleButtonPress(9)} className="tv-mobile-button tv-mobile-button-9">9</div>
                                <div onClick={handleButtonPress(0)} className="tv-mobile-button tv-mobile-button-0">0</div>
                            </div>
                        </div>
                    </div>
        </div> );
    }
    return (
        <>
                <div className="tv-root">
                    <div className="tv">
                        <div className="canvas-holder">
                            <Terminal />
                        </div>
                        <img src="tvblack.png" alt="tv" className="tv-img" />
                    </div>
                </div>
        </>
    );
}

export default App;
