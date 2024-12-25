
  /************************************************
   *     Acceleration Chart
   ************************************************/


  function updateAccelerationChart(xAcc,yAcc,zAcc){
    accChart.data.labels.push(sampleCount);
    accChart.data.datasets[0].data.push(xAcc);
    accChart.data.datasets[1].data.push(yAcc);
    accChart.data.datasets[2].data.push(zAcc);

    while(accChart.data.labels.length>maxPoints){
      accChart.data.labels.shift();
      accChart.data.datasets.forEach(ds=>ds.data.shift());
    }
    accChart.update();
  }
