function checkApogee(currentAlt){
    // Track every altitude
    allAltitudesArray.push(currentAlt);

    // Keep last 10 alt for consecutive descending check
    descentHistory.push(currentAlt);
    if(descentHistory.length>apogeeDetectN){
      descentHistory.shift();
    }

    // Track the max altitude for bars
    if(currentAlt>maxAltitudeReached){
      maxAltitudeReached=currentAlt;
    }

    // Check if last N are strictly descending
    if(!apogeeAnnounced && descentHistory.length===apogeeDetectN){
      let strictlyDescending=true;
      for(let i=0;i<descentHistory.length-1;i++){
        if(descentHistory[i]<=descentHistory[i+1]){
          strictlyDescending=false;
          break;
        }
      }
      // Confirm apogee
      if(strictlyDescending){
        const apogeeMedian=computeMedianOfTop50(allAltitudesArray,10);
        // Apogee beep
        beep(200,880,1,'square');
        speakMessage(`Apogee reached at ${Math.round(apogeeMedian)} meters`);
        apogeeAnnounced=true;
      }
    }
  }

  function computeMedianOfTop50(altArray, topN){
    // Sort all altitudes descending
    const sortedDesc=[...altArray].sort((a,b)=>b-a);
    // take topN
    const top=sortedDesc.slice(0,topN);
    // sort ascending for median
    top.sort((a,b)=>a-b);

    const n=top.length;
    if(n===0) return 0;

    const mid=Math.floor(n/2);
    if(n%2===1){
      return top[mid];
    } else {
      return (top[mid-1]+top[mid])/2;
    }
  }