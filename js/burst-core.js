  /* Burst-Core
     Copyright F1LT3R @ Bocoup
     License: Call me - http://bocoup.com */
(function( global ){

  // Array Sort
  //////////////////////////////////////////////////////////////////////////////
  function sortNumber(a,b){ return a - b; }

  // Easing
  //////////////////////////////////////////////////////////////////////////////
  var ease = {
    linear        : function(x,t,b,c,d){ return c*t/d + b; },
    inOutQuad     : function(x,t,b,c,d){ if((t/=d/2) < 1){ return c/2*t*t + b;}else{ return -c/2 * ((--t)*(t-2) - 1) + b; }},
    inOutCubic    : function(x,t,b,c,d){ if((t/=d/2) < 1){ return c/2*t*t*t + b;}else{ return c/2*((t-=2)*t*t + 2) + b; }},
    inBounce      : function(x,t,b,c,d){ return c - ease.outBounce( x, d-t, 0, c, d) + b; },
    outBounce     : function(x,t,b,c,d){ if((t/=d) < (1/2.75)){ return c*(7.5625*t*t) + b; } else if (t < (2/2.75)) { return c*(7.5625*(t-=(1.5/2.75))*t + 0.75) + b; } else if (t < (2.5/2.75)) { return c*(7.5625*(t-=(2.25/2.75))*t + 0.9375) + b; } else { return c*(7.5625*(t-=(2.625/2.75))*t + 0.984375) + b; } },
    inOutBounce   : function(x,t,b,c,d){ if(t < d/2){ return ease.inBounce(x, t*2, 0, c, d) * 0.5 + b;}else{ return ease.outBounce(x, t*2-d, 0, c, d) * 0.5 + c*0.5 + b; }}
  };

  // Burst Instance
  //////////////////////////////////////////////////////////////////////////////
  var Burst = function Burst(){
    this.timelines={};
    this.loaded={};
    this.fps = 30;
    this.timelineCount = 0;
    this.onframe=undefined;
  };

  Burst.prototype.timeline = function(name,start,end,speed,loop,callback){
    return this.timelines[name]||(arguments.length>1?this.timelines[name]=new Timeline(name,start,end,speed,loop,callback,this):undefined);
  };

  Burst.prototype.load = function( name ){  
    return this.loaded[name] || (function(){
      for(var i in this.timelines ){
        if( this.timelines[i].name === name ){
          return (this.loaded[i] = this.timelines[i]);
        }
      }
    }).call(this);
    return false;
  };

  Burst.prototype.unload = function( name ){
    delete this.loaded[name];
    return true;
  };

  Burst.prototype.play = function(){
    var deepref = this;
    // FIXME: Is this correct behavior?
    window.clearInterval(this.interval);
    this.interval = window.setInterval(function(){
      deepref.frame();
    }, 1000 / this.fps );
  };

  Burst.prototype.frame = function( frame ){
    if(this.onframe){this.onframe();}
    for( var i in this.loaded ){
      if(this.hasOwnProperty("loaded")){
        this.loaded[i].play( frame );
      }
    }
  };

  Burst.prototype.stop = function(){
    window.clearInterval( this.interval );
    // FIXME: Removed useless delete statement
  };

  // Timeline
  //////////////////////////////////////////////////////////////////////////////
  var Timeline = function Timeline(name,start,end,speed,loop,callback,parent){
    parent.timelineCount++;
    this.name=name;
    this.start=this.frame=start;
    this.end=end;
    this.speed=speed;
    this.loop=loop;
    this.callback=callback;
    this.parent=parent;
    this.objects={};
    return this;
  };

  Timeline.prototype.obj = function(name,objRef){
    return this.objects[name]||(this.objects[name]=new Obj(name,objRef,this));
  }
  
  Timeline.prototype.play = function( frame ){
    this.frame = frame || (this.frame += this.speed);
    if( this.loop ){
      if( this.frame > this.end ){ this.frame = this.start; }
      if( this.frame < this.start ){ this.frame = this.end; }
    }else{
      if( this.frame >= this.end){
        this.frame = this.end;
        //this.parent.unload(this.name);
        if(this.callback){this.callback(this.frame);}
      }
      if( this.frame <= this.start ){
        this.frame = this.start;
        //this.parent.unload(this.name);
        if(this.callback){this.callback(this.frame);}
      }
    }
    var thisObj;
    for( var i in this.objects ){
      thisObject = this.objects[i];
      for( var j in thisObject.tracks ){
        thisObject.tracks[j].play( this.frame );
      }
    }
    if( this.always ){ this.always.call(this,this.frame); }
  };  


  // Object / "Actor"
  //////////////////////////////////////////////////////////////////////////////
  var Obj = function Obj(name,objRef,parent){
    this.name=name;
    this.objRef=objRef;
    this.parent=parent;
    this.tracks={};
    return this;
  };
  
  Obj.prototype.track = function(prop){
    return this.tracks[prop]||(this.tracks[prop]=new Track(prop,this));
  };

  // Track
  //////////////////////////////////////////////////////////////////////////////
  var Track = function Track(prop,parent){
    this.prop=prop;
    this.parent=parent;
    this.keys=[];
    this.unit=typeof this.parent.objRef[prop] === 'number' ? undefined : this.parent.objRef[prop].replace(/[.0-9]/g,'');
    this.alwaysCallback;
    return this;
  };
  
  Track.prototype.key = function(frame,value,ease,callback){
    for(var i=0,l=this.keys.length;i<l;i++){
      if(this.keys[i].frame === frame){
        return this.keys[i];
      }
    }
    if(arguments.length>1){
      var keyIndex=[], keyStack=[], thisKey = this.keys[this.keys.length] = new Key(frame,value,ease,callback,this);
      for(i=0;i<this.keys.length;i++){
        keyIndex[i]=this.keys[i].frame;
      }
      keyIndex.sort(sortNumber);
      for(i=0;i<this.keys.length;i++){
        for(var j=0;j<this.keys.length;j++){
          if(keyIndex[i]==this.keys[j].frame){
            keyStack[i]=this.keys[j];
          }
        }
      }
      this.keys=[];
      for(i=0, l=keyStack.length; i< l; i++){
        this.keys[i] = keyStack[i];
      }
      return thisKey;
    }else{
      return false;
    }
  };

  Track.prototype.play = function(frame){
    var curKey, nextKey, val;
    for(var i=0, l=this.keys.length; i<l; i++){
      curKey = this.keys[i];
      nextKey = this.keys[i+1];
      if(nextKey === undefined && i+1 > l-1){
        nextKey = this.keys[l-1];
      }
      if( frame >= curKey.frame && frame < nextKey.frame ){
         val = ease[ curKey.ease ]( 0,
          frame-curKey.frame,
          curKey.value,
          nextKey.value-curKey.value,
          nextKey.frame-curKey.frame );
          
          if(this.lastKeyFired && this.lastKeyFired.frame != curKey.frame){
            this.lastKeyFired.callbackFired = false;
          }
          
          if(curKey.callback && !curKey.callbackFired){
            curKey.callback.call(this.parent.objRef, {
              frame      : frame,
              prop       : this.prop,
              burstTrack : this
            });
            curKey.callbackFired=true;
            this.lastKeyFired = curKey;
          }

      }else if( frame >= nextKey.frame || frame === 0 ){
        val = curKey.value;
      }
    }
    if(this.alwaysCallback){
      this.alwaysCallback.call(this.parent.objRef, {
        frame      : frame,
        prop       : this.prop,
        burstTrack : this
      });
    }
    this.parent.objRef[this.prop] = val + (this.unit||0);
  };

  Track.prototype.always = function( func ){
    this.alwaysCallback = func;
    return this;
  };

  Track.prototype.obj=function(name,objRef){
    var timeline = this.parent.parent;
    return timeline.obj.call(timeline,name,objRef);
  };

  // Key
  //////////////////////////////////////////////////////////////////////////////
  var Key = function Key(frame,value,ease,callback,parent){
    this.frame=frame;
    this.value=value;
    this.ease=ease||'linear';
    this.callback=callback;
    this.callbackFired=false;
    this.parent=parent;
    return this;
  };

  Key.prototype.obj=function(name,objRef){
    var timeline = this.parent.parent.parent;
    return timeline.obj.call(timeline,name,objRef);
  };

  Key.prototype.track=function(name,objRef,prop){
    var obj = this.parent.parent;
    return obj.track.call(obj,name,objRef,prop);
  };

  Key.prototype.key=function(frame,value,ease,callback){
    var track = this.parent;
    return track.key.call(track,frame,value,ease,callback);
  };

  Key.prototype.always=function(func){
    var track = this.parent;
    return track.always.call(track,func);
  };

  // Instantiation
  //////////////////////////////////////////////////////////////////////////////
  global.Burst = Burst;

})( this );

