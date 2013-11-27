//
//  halfviz.js
//
//  Created by Christian Swinehart on 2010-12-20.
//  Copyright (c) 2011 Samizdat Drafting Co. All rights reserved.
//

(function($){

  trace = arbor.etc.trace
  objmerge = arbor.etc.objmerge
  objcopy = arbor.etc.objcopy
  
  /* now write something new  */
  modelsPackage=""   //the real path should be modelsPackage+modelname, for example"ModelData/VULCAN"
  currentModel=""
  highlightedNodeNames=new Array()
  exploringflag=0
  /* end of write something new  */
  path=""
  pagefile=""
  sectionNodeName=null
  pagesection="tab1"

 
  /* Nano Templates (Tomasz Mazur, Jacek Becela) */
  var nano = function(template, data){
    return template.replace(/\{([\w\-\.]*)}/g, function(str, key){
      var keys = key.split("."), value = data[keys.shift()]
      $.each(keys, function(){ 
        if (value.hasOwnProperty(this)) value = value[this] 
        else value = str
      })
      return value
    })
  }

  
  var Renderer = function(canvas)
  {
    var canvas = $(canvas).get(0)
    var ctx = canvas.getContext("2d")
    var gfx = arbor.Graphics(canvas)
    var particleSystem = null
    var dependencyEdge=[]
    var loadtool=null
  	// helpers for figuring out where to draw arrows (thanks springy.js)
  	var intersect_line_line = function(p1, p2, p3, p4)
  	{
  		var denom = ((p4.y - p3.y)*(p2.x - p1.x) - (p4.x - p3.x)*(p2.y - p1.y));
  		if (denom === 0) return false // lines are parallel
  		var ua = ((p4.x - p3.x)*(p1.y - p3.y) - (p4.y - p3.y)*(p1.x - p3.x)) / denom;
  		var ub = ((p2.x - p1.x)*(p1.y - p3.y) - (p2.y - p1.y)*(p1.x - p3.x)) / denom;

  		if (ua < 0 || ua > 1 || ub < 0 || ub > 1)  return false
  		return arbor.Point(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
  	}

  	var intersect_line_box = function(p1, p2, boxTuple)
  	{
	  if(boxTuple==undefined) return false
  	  var p3 = {x:boxTuple[0], y:boxTuple[1]},
      	  w = boxTuple[2],
      	  h = boxTuple[3]
  	  
  		var tl = {x: p3.x, y: p3.y};
  		var tr = {x: p3.x + w, y: p3.y};
  		var bl = {x: p3.x, y: p3.y + h};
  		var br = {x: p3.x + w, y: p3.y + h};

      return intersect_line_line(p1, p2, tl, tr) ||
             intersect_line_line(p1, p2, tr, br) ||
             intersect_line_line(p1, p2, br, bl) ||
             intersect_line_line(p1, p2, bl, tl) ||
             false
  	}
  	
  		
    var that = {
      //
      // the particle system will call the init function once, right before the
      // first frame is to be drawn. it's a good place to set up the canvas and
      // to pass the canvas size to the particle system
      //
	  
      init:function(system){
        // save a reference to the particle system for use in the .redraw() loop
       particleSystem = system
        // inform the system of the screen dimensions so it can map coords for us.
        // if the canvas is ever resized, screenSize should be called again with
        // the new dimensions
        particleSystem.screenSize(canvas.width, canvas.height) 
        particleSystem.screenPadding(40) // leave an extra 20px of whitespace per side
        ourterHandler=that.initMouseHandling()

      },

      // 
      // redraw will be called repeatedly during the run whenever the node positions
      // change. the new positions for the nodes can be accessed by looking at the
      // .p attribute of a given node. however the p.x & p.y values are in the coordinates
      // of the particle system rather than the screen. you can either map them to
      // the screen yourself, or use the convenience iterators .eachNode (and .eachEdge)
      // which allow you to step through the actual node objects but also pass an
      // x,y point in the screen's coordinate system
      // 

      redraw:function(){
        if (!particleSystem) return
                
        ctx.clearRect(0,0, canvas.width, canvas.height)
        var nodeBoxes = {}	
		
        particleSystem.eachNode(function(node, pt){
          // node: {mass:#, p:{x,y}, name:"", data:{}}
          // pt:   {x:#, y:#}  node position in screen coords
          

          // determine the box size and round off the coords if we'll be 
          // drawing a text label (awful alignment jitter otherwise...)
          ctx.globalAlpha = 1
		  if (node.data.alpha===0) return
		  ctx.font="bold 14px Century Gothic";
		  var label=node.data.label
          if(label==null)label=node.name
		  
          var w = ctx.measureText(""+node.name).width + 6
		  
          if (!(""+label).match(/^[ \t]*$/)){
            pt.x = Math.floor(pt.x)
            pt.y = Math.floor(pt.y)
          }else{
            label = null
          }
		  if(node.data.type=="root"||node.data.type=="subroot")
		  {
			  if(node.data.type=="root") ctx.font = "bold 14px Century Gothic"
			  else  ctx.font = "bold 12px Century Gothic"
	        		  var names=node.name.split(" ")
	        		  var lineh=18
	        	      var lngstw=0
	        	      //find the longest word
	        		  for(var i=0;i<names.length;i++){
	        			  var onew= ctx.measureText(""+names[i]).width + 15
	        			  if(onew>lngstw) lngstw=onew
	        		  }
	        	  //draw background
	        	 // gfx.rect(pt.x-lngstw/2, pt.y-8, lngstw, names.length*lineh, 4, {fill:'#f4cf9e'}) 
	        	     //this is the outside text rectangle
	        	var r
                if(lngstw>names.length*lineh) r=lngstw/2
                else r=names.length*lineh/2
                var circlex=pt.x
                var circley=pt.y-8+names.length*lineh/2
		        	 ctx.beginPath()
		        	 ctx.arc(circlex,circley,r,0,2*Math.PI,false)
		        	 ctx.fillStyle='#796157'
		        	 ctx.fill()
		        	 ctx.strokeStyle = '#796157'
		             ctx.lineWidth = 3
		        	 ctx.stroke()
	        	  //draw text
	        	  for(var i=0;i<names.length;i++){
      			  var onew=ctx.measureText(""+names[i]).width + 15
      			  ctx.textAlign = "center"
      			  ctx.fillStyle = "white"
      			  ctx.fillText(names[i].toUpperCase()||"", pt.x, (pt.y+4)+i*lineh)
      		  }
		       nodeBoxes[node.name] = [circlex-r, circley-r, 2*r, 2*r]
		  }
		  else
		  {
			  if(node.data.highlight==1){
				  if(node.data.type!="root"){
					    ctx.font = "italic 10px Helvetica"
						    var label
						    if(node.data.category=='CA')label="Capability"
						    else if(node.data.category=='DT')label="Domain Tech."
						    else if(node.data.category=='IT')label="Impl. Tech."
						    else if(node.data.category=='OE')label="Environment"
						    var catw = ctx.measureText(""+label).width + 6
						    var cath=20
						    var overlap=6
					  if(node.data.type=='mandatory'){
						    gfx.rect(pt.x-w/2, pt.y-11-cath+overlap, catw,cath, 6, {fill:'#796157'})//prefix background
							gfx.rect(pt.x-w/2, pt.y-11, w,20, 4, {fill:'#d9cfc5'})  //content background
						}
						else if(node.data.type=='optional'){
						    gfx.rect(pt.x-w/2, pt.y-11-cath+overlap, catw,cath, 6, {fill:'#f0953c'})//prefix background
							gfx.rect(pt.x-w/2, pt.y-11, w,20, 4, {fill:'#f4cf9e'})  //content background
					  }
						else if(node.data.type=='alter'){
						    gfx.rect(pt.x-w/2, pt.y-11-cath+overlap, catw,cath, 6, {fill:'#44867f'})//prefix background
							gfx.rect(pt.x-w/2, pt.y-11, w,20, 4, {fill:'#b7d4d1'})  //content background
					  }
					   //draw the prefix
			            ctx.textAlign = "center"
			            ctx.fillStyle = "white"
						ctx.fillText(label||"",pt.x-w/2+catw/2, pt.y-cath+6)
			           // draw the text
			            ctx.font = "bold 14px Century Gothic"
			            ctx.textAlign = "center"
			            ctx.fillStyle = "#796157"
			            ctx.fillText(node.name||"", pt.x, pt.y+4)
					    nodeBoxes[node.name] = [pt.x-w/2, pt.y-11-cath+overlap, w, 22+cath-overlap]
				  }
			  }
			  else{
				 if(node.data.highlight==-1) ctx.globalAlpha = 0.5
				 else ctx.globalAlpha = 1
					    ctx.font = "12px Helvetica"
		  		        ctx.textAlign = "center"
		  		        ctx.fillStyle = "#796157"
		  		        ctx.fillText(label||"", pt.x, pt.y+4)
		  		        var w1 = ctx.measureText(""+label).width
		  			    nodeBoxes[node.name] =  [pt.x-w1/2, pt.y-6,w1,12] 
			    }    
		}

        }) //end of drawing node   			

        
        ctx.strokeStyle = "#796157"
        ctx.lineWidth = 1
        ctx.beginPath()
        particleSystem.eachEdge(function(edge, pt1, pt2){
          // edge: {source:Node, target:Node, length:#, data:{}}
          // pt1:  {x:#, y:#}  source position in screen coords
          // pt2:  {x:#, y:#}  target position in screen coords
          if (edge.data.alpha===0) return
          var weight = edge.data.weight
          var color = edge.data.color
          
          // trace(color)
          if (!color || (""+color).match(/^[ \t]*$/)) color = null

          // find the start point
          var tail = intersect_line_box(pt1, pt2, nodeBoxes[edge.source.name])
          var head = intersect_line_box(tail, pt2, nodeBoxes[edge.target.name])

			ctx.save() 
            ctx.beginPath()

            if (!isNaN(weight)) ctx.lineWidth = weight
            if (color) ctx.strokeStyle = color
            // if (color) trace(color)
            ctx.fillStyle = null
			if(edge.data.dashline=="true"){ctx.setLineDash([5])}
            
            ctx.moveTo(tail.x, tail.y)
            ctx.lineTo(head.x, head.y)
            ctx.stroke()
            ctx.restore()
          
          // draw an arrowhead if this is a -> style edge
          if (edge.data.directed){
            ctx.save()
              // move to the head position of the edge we just drew
              var wt = !isNaN(weight) ? parseFloat(weight) : ctx.lineWidth
			  ctx.translate(head.x, head.y);
			  ctx.rotate(Math.atan2(head.y - tail.y, head.x - tail.x));
			  ctx.fillStyle = (color) ? color : ctx.strokeStyle
		//for arrow
		
           var arrowLength = 6 + wt
           var arrowWidth = 2 + wt
       
              // delete some of the edge that's already there (so the point isn't hidden)
            ctx.clearRect(-arrowLength/2,-wt/2, arrowLength/2,wt)
              // draw the chevron
			ctx.beginPath();
			ctx.moveTo(-arrowLength, arrowWidth);
			ctx.lineTo(0, 0);
			ctx.lineTo(-arrowLength, -arrowWidth);
			ctx.lineTo(-arrowLength * 0.8, -0);
			ctx.closePath();
    
	   ////for rect
	   /*
				var arrowLength = 16 + wt
				var arrowWidth = 8 + wt
				
				ctx.fillRect(-arrowLength/2,-arrowWidth/2, arrowLength/2,arrowWidth);
			*/	
		//for circle		
				
				ctx.fill();
				ctx.restore()
          }
        })
      },
      setLoadtool:function(tool){
    	  loadtool=tool
      },
	  switchSection1:function(self)
	  {
		 that.dohighlight(self)
		 that.showchildren(self)
	  },
	  dohighlight:function(node){
		  if(exploringflag==0)exploringflag=1
		  node.fixed=true
		  node.data.highlight=1
		  highlightedNodeNames.push(node.name)
		 // var s="ul h a:contains("+node.name+")"
		  $("#featurelist").find("ul h a").each(function(){
			  if($(this).html()==node.name){
				  $(this).css({"font-weight":"bold"})
			  }
		  })
		  that.cancelhighlightfromplain()
	  },
	 cancelhighlight:function(node){
		  node.fixed=false
		  node.data.highlight=0
		  highlightedNodeNames.splice(highlightedNodeNames.indexOf(node.name),1)
		 $("#featurelist").find("ul h a").each(function(){
			  if($(this).html()==node.name){
				  $(this).css({"font-weight":"normal"})
			  }
		  })
	 },
	 
	 cancelhighlightfromplain:function(){
		 particleSystem.eachNode(function(node, pt){
			 if(node.data.highlight==0){
				 node.data.highlight=-1
			 }
		 })
		 that.redraw()
	 },
	  showchildren:function(self)
	  {
	  	$.map(particleSystem.getEdgesFrom(self), function(edge){
			var newnode= edge.target
			//newnode.fixed=true
			var currentL=Math.pow((newnode.p.x-self.p.x),2)+Math.pow((newnode.p.y-self.p.y),2)
			var scale
			if(currentL<14) scale=10/currentL
			else  scale=1.001
		   //   particleSystem.tweenNode(newnode, .5, {alpha:1.0})
              newnode.p.x = self.p.x+(newnode.p.x-self.p.x)*scale
              newnode.p.y = self.p.y+(newnode.p.y-self.p.y)*scale
             // newnode.tempMass = .001
             // newnode.data.highlight=1
             // highlightedNodeNames.push(newnode.name)
              that.dohighlight(newnode)
        });
	  
		return false;
	  },
	  createDependency:function(sourcenode){
	 
	  if(sourcenode.data.depend){ //without predefined edge
		var dependents=sourcenode.data.depend.split("^")
		$.each(dependents,function(){
		   var destNode=particleSystem.getNode(this.valueOf());
		   
				//up to root
			that.showpath(destNode);
		
		  var newedge=particleSystem.addEdge(sourcenode,destNode,{color:'red',directed:true});
	      dependencyEdge.push(newedge);
		})
	//	  { nodes:{foo:{color:"red", mass:2},bar:{color:"green"}} }
	//	  { edges:{bar:{foo:{similarity:0}, baz:{similarity:.666}} }
		particleSystem.merge(dependencyEdge);		
	  }
	  },
      removeMouseMovementfromCanvas:function(){
	      $(canvas).unbind('mousemove');
	  },	 	
      addMouseMovementfromCanvas:function(){
		$(canvas).bind('mousemove',ourterHandler.moved);
	  },	  
  	  bindsubpagelink:function(){
	    //alert("aaa");
		$(".description").find('a').click(that.traceGraph)
	  },

	  findChildrenNumber:function(node){
			var result = particleSystem.getEdgesFrom(node).length
			return result
		},

	  initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
		
      	selected = null
      	nearest = null
      	var dragged = null
        var oldmass = 1
        this.mousedownx=0
        this.mousedowny=0
       // var mousemovenode=null
        var handler = {
		  //handlerProperty:"haha",
	    moved:function(e){
             var pos = $(canvas).offset();
             _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
              nearest = particleSystem.nearest(_mouseP);
	          if(!nearest) return
			  selected = (nearest.distance < 40) ? nearest : null
			  
			  if (selected){		
					$(canvas).addClass('linkable')
					var childrenN=that.findChildrenNumber(selected.node)
					var htmlstr=selected.node.name+"&nbsp;&nbsp;<span style='background:#f58321'>Children:"+childrenN+"</span>"
					$('#title').html(htmlstr);
					$('#title').css({'left':e.pageX,'top':e.pageY+15})
					$('#title').fadeIn('fast');
				//	particleSystem.tweenNode(selected.node,0.1, {fillcolor:"#796157"})
				//	mousemovenode=selected.node
              }
			  else{
				 $(canvas).removeClass('linkable')
				 $('#title').fadeOut('fast');
				// particleSystem.tweenNode(mousemovenode,0.1, {fillcolor:"#ffffff"})
			  } 
			  
			  return false
          },	
	    clicked:function(e){
        		var pos = $(canvas).offset();
        		_mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
        		mousedownx=e.pageX
        		mousedowny=e.pageY
        		nearest = dragged = particleSystem.nearest(_mouseP)
				if (nearest && selected && nearest.node===selected.node){
					if (e.ctrlKey){   //if control key is pressed
				  //  $(canvas).addClass('linkable')
						var toLoad = path+selected.node.data.link+' .container';
						$('.description').load(toLoad,'',function(){
							$(canvas).removeClass('linkable');
							that.bindsubpagelink();
							pagefile=selected.node.data.link;
							
							$('.container').find('div').each(function(index){
							     if(index==2) 
								 {
								 	$(this).fadeTo("fast",0,function(){
										$(this).hide(100);
										$('.container').find('#'+pagesection).stop(true).fadeTo("fast",1);
								    })
								 }
								 else $(this).hide(100);
							})
						});
					}
					else if(e.altKey){
						$(window).bind("keyup",handler.altkeyup);
						//$(window).keyup(handler.altkeyup)
						that.createDependency(selected.node);
					}
					else{
		//******************************to move nodes*****************//	
						if (dragged && dragged.node !== null) dragged.node.fixed = true
						$(canvas).bind('mousemove', handler.dragged)
						$(window).bind('mouseup', handler.dropped)						
					}
				}
        		return false
        },
        doubleclicked:function(e){
    		var pos = $(canvas).offset();
    		_mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
    		mousedownx=e.pageX
    		mousedowny=e.pageY
    		nearest= particleSystem.nearest(_mouseP)
    		selected = (nearest.distance < 60) ? nearest : null
        	if(selected==null){
        		sectionNodeName=null
    			particleSystem.eachNode(function(node,pt){
    				that.cancelhighlight(node)
    			})
    			that.redraw()
        	}
           return false
        },
        dropped:function(e){
            if (dragged===null || dragged.node===undefined) return
            if (dragged.node !== null){
            	if(dragged.node.data.highlight!=1)dragged.node.fixed = false
            }
            dragged.node.tempMass = 1000
        	//******************************to 	spread the children nodes*****************//	
            if(e.pageX==mousedownx&&e.pageY==mousedowny)
            {
            	if(selected.node.data.type=="subroot"){
            		if(loadtool!=null) loadtool.loadFile(selected.node.name)
            	}
            	else{
	                if(selected.node.name!=sectionNodeName){
    	   				that.switchSection1(selected.node)
        				sectionNodeName=selected.node.name
    				}
            	}
    			
            }
            dragged = null
            selected = null
            $(canvas).unbind('mousemove', handler.dragged)
        	$(window).unbind('mouseup', handler.dropped)
            _mouseP = null
            
            
            return false
          },
        dragged:function(e){
            var old_nearest = nearest && nearest.node._id
        		var pos = $(canvas).offset();
        		var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (!nearest) return
        		if (dragged !== null && dragged.node !== null){
              var p = particleSystem.fromScreen(s)
        			dragged.node.p = p//{x:p.x, y:p.y}
         			//dragged.tempMass = 100000
        		}

            return false
        	},
		saveData:function(e){	
			    localStorage.clear();
				var txt=that.createStatusTxt();
				console.log(txt);
				console.log(particleSystem.bounds());
			//	localStorage.nodestate="hello->World {}\n hello->China{}\n hello->Korea{} \n Korea->Postech{}\n Postech->SElab{}\n Postech->China{color:red,alpha:0}\n hello{alpha:1,link:pages/adaptive_component_dev.html,nx:0.15,ny:2.98}\n World{alpha:1,nx:2.17,ny:5.16}\n Korea{alpha:1,nx:0.56,ny:-0.25}\n China{alpha:1,nx:-2.49,ny:4.31}\n Postech{alpha:1,nx:0.49,ny:-3.35}\n SElab{alpha:1,nx:-0.06,ny:-6.11}\n"
		        localStorage.nodestate =txt;
		        localStrogae.modelname=currentModel;
				return false
		},//end of test
		cleanData:function(e){
		        localStorage.clear();
				return false
		},
		altkeyup:function(e){
			if(dependencyEdge.length!=0){
			$.each(dependencyEdge,function(i,edge){
				particleSystem.pruneEdge(edge);
			})
			dependencyEdge=[];
			}
			$(window).unbind("keyup",handler.altkeyup);
			return false
		}
        };//end of handler
    
        $(canvas).mousedown(handler.clicked);
        $(canvas).dblclick(handler.doubleclicked);
		$(canvas).bind('mousemove', handler.moved);
		$(".back").click(handler.saveData);
		$(".clean").click(handler.cleanData);

		//alert(handler.handlerProperty);
	  //  test=function(){alert("aaa")};
	//	test();
		return handler
      } //end of initMouseHandling
    	
    }
    
	return that
  }    

 var Parseur = function(){
    var strip = function(s){ return s.replace(/^[\s\t]+|[\s\t]+$/g,'') }    
    var recognize = function(s){
      // return the first {.*} mapping in the string (or "" if none)
      var from = -1,
          to = -1,
          depth = 0;
	  for(var i=0;i<s.length;i++)
	  {
	      switch (s[i]){
          case '{':
            if (depth==0 && from==-1) from = i
            depth++
            break
          case '}':
            depth--
            if (depth==0 && to==-1) to = i+1
            break
        }
	  }

      return s.substring(from, to)
    }
    var unpack = function(os){
      // process {key1:val1, key2:val2, ...} in a recognized mapping str
      if (!os) return {}

      var pairs = os.substring(1,os.length-1).split(/\s*,\s*/)
      var kv_data = {}

      $.each(pairs, function(i, pair){
        var kv = pair.split(':')
        if (kv[0]===undefined || kv[1]===undefined) return
        var key = strip(kv[0])
        var val = strip(kv.slice(1).join(":")) // put back any colons that are part of the value
        if (!isNaN(val)) val = parseFloat(val)
        if (val=='true'||val=='false') val = (val=='true')
        kv_data[key] = val
      })
      // trace(os,kv_data)
      return kv_data
    }


    var lechs = function(s){
      var tokens = []

      var buf = '',
          inObj = false,
          objBeg = -1,
          objEnd = -1;

      var flush = function(){
        var bufstr = strip(buf)
        if (bufstr.length>0) tokens.push({type:"ident", ident:bufstr})
        buf = ""
      }

      s = s.replace(/([ \t]*)?;.*$/,'') // screen out comments

      for (var i=0, j=s.length;;){
        var c = s[i]
        if (c===undefined) break
        if (c=='-'){
          if (s[i+1]=='>' || s[i+1]=='-'){
            flush()
            var edge = s.substr(i,2)
            tokens.push({type:"arrow",directed:(edge=='->')})
            i+=2
          }else{
            buf += c
            i++
          }
        }else if (c=='{'){
          var objStr = recognize(s.substr(i))
          if (objStr.length==0){
            buf += c
            i++
          }else{
            var style = unpack(objStr)
            if (!$.isEmptyObject(style)){
              flush()
              tokens.push({type:"style", style:style})
            }
            i+= objStr.length
          }
        }else{
          buf += c
          i++
        }
        if (i>=j){
          flush()
          break
        }
      }

      return tokens
    }
    
    var yack = function(statements){
      var nodes = {}
      var edges = {}
      
      var nodestyle = {}
      var edgestyle = {}
      $.each(statements, function(i, st){
        var types = $.map(st, function(token){
          return token.type
        }).join('-')
        
        // trace(st)
        if (types.match(/ident-arrow-ident(-style)?/)){
          // it's an edge
          var edge = { src:st[0].ident, dst:st[2].ident, style:(st[3]&&st[3].style||{}) }
          edge.style.directed = st[1].directed
          if (nodes[edge.src]===undefined) nodes[edge.src] = ($.isEmptyObject(nodestyle)) ? -2600 : objcopy(nodestyle)
          if (nodes[edge.dst]===undefined) nodes[edge.dst] = ($.isEmptyObject(nodestyle)) ? -2600 : objcopy(nodestyle)
          edges[edge.src] = edges[edge.src] || {}
          edges[edge.src][edge.dst] = objmerge(edgestyle, edge.style)
        }else if (types.match(/ident-arrow|ident(-style)?/)){
          // it's a node declaration (or an edge typo but we can still salvage a node name)
          var node = st[0].ident
          if (st[1]&&st[1].style){
            nodes[node] = objmerge(nodestyle, st[1].style)
          }else{
            nodes[node] = ($.isEmptyObject(nodestyle)) ? -2600 : objcopy(nodestyle) // use defaults
          }
          
        }else if (types=='style'){
          // it's a global style declaration for nodes
          nodestyle = objmerge(nodestyle, st[0].style)
        }else if (types=='arrow-style'){
          // it's a global style declaration for edges
          edgestyle = objmerge(edgestyle, st[1].style)
        }
      })
      
      // find any nodes that were brought in via an edge then never styled explicitly.
      // they get whatever the final nodestyle was built up to be
      $.each(nodes, function(name, data){
        if (data===-2600){
          nodes[name] = objcopy(nodestyle)
        }
      })
      
      return {nodes:nodes, edges:edges}
    }

    var that = {
      lechs:lechs,
      yack:yack,
      parse:function(s){
        var lines = s.split('\n')
        var statements = []
        $.each(lines, function(i,line){
          var tokens = lechs(line)
          if (tokens.length>0) statements.push(tokens)
        })
        
        return yack(statements)
      }
    }
    
    return that
  }

  var Dashboard = function(sys){
	var _ed=$('#editor')
	var _dragOffset = {x:0, y:0}
    var that = {
      
     init:function(){

		
		_ed.find('h4').mousedown(that.beginMove)
		$("#Eclose").click(that.hideEditor)
		$("#Eopen").click(that.showEditor)
		_ed.find('.icon').mousedown(that.resizemousedown)
        $('.help').click(that.showmyHelp)
        $("#intro h1 a").click(that.hideIntro)
		$("#intro div").mouseover(that.mousemoveover)
		$("#intro div").mouseout(that.mousemoveout)
		$("#intro div").click(that.buttonevent)
	    
		$(".description").find('a').click(that.traceGraph)
		$("#editor").find('h4 a').click(that.switchPageSection)
		
	
        return that
      },
     loadInitialPageSection:function(){
    	var toLoad=path+pagefile+" .container";
 		$(".description").load(toLoad,"",function(){
 		  that.bindsubpagelink();
 		})
     },
	 changemodel:function(e){
		var model=$(this).html();
		if(model!=currentModel) {
			currentModel=model;
			var loadtool=new loadJsonData(currentModel,null,sys)
			loadtool.loadFile()
		}
	
	 },
	 hideEditor:function(e){
	 if(_ed.find('.description').css("display")=='block')
	 {
	 	_ed.find('.description').stop(true).fadeTo(100,0,function(){
		
	   $(this).hide(100);
	   _ed.find(".icon").hide("fast",function(){
			_ed.animate({height:22},200)
	   });
	 })
	 }
	 }, 
	 showEditor:function(e){
	// console.log(_ed.find('.description').css("display"))
		if(_ed.find('.description').css("display")=="none")
		{
		  _ed.find('.description').show('fast',function(){
		    _ed.animate({height:400},200,function(){
			    _ed.find('.description').css({height:340})
				_ed.find('.description').fadeTo('fast',1,function(){
			   _ed.find(".icon").show()
			})
			
			})
		  })
		}
	 },
	 resizemousedown:function(e){
		 sys.renderer.removeMouseMovementfromCanvas();
		 var edoffset=_ed.offset()
		 $(window).bind('mousemove', that.resizemousemove)
		 $(window).bind('mouseup', that.resizemouseup)
		 return false
	 },
	 resizemousemove:function(e){
		 var edoffset=_ed.offset()
		 var mousex=e.clientX||e.PageX
		 var mousey=e.clientY||e.PageY
		 console.log(mousex+","+mousey)
		 var pos= {left:edoffset.left, top:edoffset.top,width:mousex-edoffset.left, height:mousey-edoffset.top}
		 if(pos.width>300&&pos.height>100)
		 {
			 _ed.css(pos)
			 _ed.find('.description').css({height:mousey-edoffset.top-60,  width:mousex-edoffset.left-60})	
			 _ed.find("h4 a").css({width:((mousex-edoffset.left)-100)/3})
		 }

		 return false
	 },
	 resizemouseup:function(e){
		$(window).unbind('mousemove', that.resizemousemove)
        $(window).unbind('mouseup', that.resizemouseup)
		sys.renderer.addMouseMovementfromCanvas()
		return false
	 },
	  beginMove:function(e){
	    sys.renderer.removeMouseMovementfromCanvas();
		var edoffset=_ed.offset()
		_dragOffset.x=edoffset.left-e.pageX;
		_dragOffset.y=edoffset.top-e.pageY;
		$(window).bind('mousemove', that.moved)
        $(window).bind('mouseup', that.endMove)
        return false
	  },
	  moved:function(e){
		var pos= {left:e.pageX+_dragOffset.x, top:e.pageY+_dragOffset.y}
		_ed.css(pos)
		return false
	  },
	  endMove:function(e){
		$(window).unbind('mousemove', that.moved)
        $(window).unbind('mouseup', that.endMove)
		sys.renderer.addMouseMovementfromCanvas()
        return false
	  },
      switchPageSection:function(e){
	   //var newMode = $(e.target).text().toLowerCase().replace(" ","");
	   var newMode = $(e.target).attr('href').substring(1);
	   //alert(newMode)
	   $("#editor").find('h4 a').removeClass('active');
	   $(e.target).addClass('active');
//	   if(newMode!==pagesection){
//		 $(".description").find("#"+pagesection).stop(true).fadeTo('fast',0,function(){
//			$(this).hide();
//			$(".description").find("#"+newMode).stop(true).fadeTo('fast',1,function(){
//				pagesection=newMode;
//			})
//	   })
	   	if(newMode!==pagesection){
		 $(".description").find("#"+pagesection).stop(true).hide('fast',0,function(){
			$(this).hide('fast',function(){
				$(".description").find("#"+newMode).stop(true).fadeTo('fast',1,function(){
				pagesection=newMode;
			})
			});
	   })
	   }
	    return false;
	 //  var toLoad=path+pagefile+" #"+pagesection;
	 //  	$(".description").load(toLoad,"",function(){
	//	  that.bindsubpagelink();
	//	});
	  },
	  bindsubpagelink:function(){
	  //alert("aaa");
		$(".description").find('a').click(that.traceGraph)
		return false;
	  },
	  createStatustxt:function()
	  {
	  	var result="";
		sys.eachNode(function(node, pt){
			var arborp=sys.fromScreen(pt)
			console.log("NodeName: "+node.name+" x: "+arborp.x+" y: "+arborp.y)
			var x=arborp.x/1000
			//var x=0
			var y=arborp.y/1000
			//var y=0
			result=result+node.name+"{alpha:"+node.data.alpha
			result=result+",x:"+x.toFixed(2)+",y:"+y.toFixed(2)	
			result=result+"}\n"
		})

		return result;
	  },
	  showcompletetree:function(){
		sys.eachNode(function(node,pt){
			if(node.data.alpha==0){
				sys.tweenNode(node, .5, {alpha:1});
			}
		})
		sectionNodeName=null;
		return false;
	  },
	  buttonevent:function(e){
		var menu=$(this).html();
		if(menu.indexOf("Whole")!=-1){
		  that.showcompletetree();
		}
		else if(menu.indexOf("Save")!=-1){
		  var result=that.createStatustxt();
		  console.log(result);
		  localStorage.nodestate =result;
		  localStorage.modelname=currentModel;
		  alert("This status is saved for next loading!")
		}
		else if(menu.indexOf("Clean")!=-1){
		  localStorage.clear();
		  alert("Your status is cleaned from local storage!")
		}
		return false;
	  },
         mousemoveover:function(e){
		   $(this).css('backgroundPosition', '0px 90px');
		   return false;
		 },
		mousemoveout:function(e){
		   $(this).css('backgroundPosition', '0px 0px');
		   return false;
		 },
		traceGraph:function(){
		    alert($(this).attr("href"));
		   if($(this).attr("href").indexOf("#F:")!==-1){
	
			
		   }
		   return false;
		},
      showmyHelp:function(e){
        var intro = $("#intro")
        if (intro.css('display')=='block') return false
        
        intro.stop(true).css('opacity',0).show().fadeTo('fast',1)
		$('.help').fadeOut();
        return false
      },
      hideIntro:function(e){
	    var intro = $("#intro")
        if (intro.css('opacity')<1) return false
        
        intro.stop(true).fadeTo('fast',0, function(){
          intro.fadeOut()
		  $('.help').fadeIn();
        })
		
        return false
      }
	}
    return that.init()    
  }
  
//using constructor to achieve privacy
var loadJsonData=function(storage,sys,dashboard){
	//all attributes are private 
	//with a public function load {} no return
	//var modelname=modelname
	var storage=storage
	var sys=sys
	var dash=dashboard
	var childrenModels = new Array()

	var _refreshNumber=function(count,mandN,optionalN,alterN){
		   $("#modellogo").find('h4').each(function(index){
			   if(index==0) $(this).html(count)
				else if(index==1) $(this).html(mandN)
				else if(index==2) $(this).html(optionalN)
				else if(index==3) $(this).html(alterN)
			   })
	}

	var _createHtml=function(data,lastString){
		var newhtml=lastString
		$.each(data,function(key,val){
			var str="<ul><img src=\"halfviz_files/imgs/down.gif\"><h><a>"+key+"</a></h>"
			newhtml+=str
			if(Object.keys(val).length!=0){
					newhtml+="<li>"
						newhtml=_createHtml(val,newhtml)
					newhtml+="</li>"
					    //find the children of current model
						if(currentModel==key){
						   $.each(val,function(subkey,subval){
							   childrenModels.push(subkey)
						   })
						}
			}
			newhtml+="</ul>"
		})
		return newhtml
	}

    var _createHtmlforFeatures=function(parentnode,lastString){
    	var newhtml=lastString
    	var newhtml="<ul><img src=\"halfviz_files/imgs/down.gif\"><h><a>"+parentnode+"</a></h>"
    	var node=sys.getNode(parentnode)
    	    $.map(sys.getEdgesFrom(node), function(edge){
    	    	var child=edge.target;
    	    	if(child!=null&&child.data.type!="subroot"){
    	    		newhtml+="<li>"
    	    		newhtml+=_createHtmlforFeatures(child.name,newhtml)
    	    		newhtml+="</li>"	
    	    	}
		   })
    	newhtml+="</ul>"
    	
    	return newhtml
    } 
  
	var that={
			loadFile:function(modelname){
			
				var root
			   
				var tree={nodes:{},edges:{}}
				var filepath=modelsPackage+modelname+"/"+modelname+".json"
				var jqxhr =$.getJSON(filepath, function(data){
			        var mandN=0;
			        var optionalN=0;
					var alterN=0;
					$.each(data.nodes,function(key,val){
						tree.nodes[key]=val;
						//console.log(key);
						var namearray=key.split(" ");
						if(namearray.length>2){
							tree.nodes[key].label=namearray[0]+" "+namearray[1]+" ..."
						}
						//add highlight attribute
						tree.nodes[key].highlight = 0
						//add fillcolor attribute
						tree.nodes[key].fillcolor = "#ffffff"
					    //add alpha attribute
						tree.nodes[key].alpha = 0.6
						
						if(tree.nodes[key].type=="root"||tree.nodes[key].type=="mandatory")  {
							mandN++
							if(tree.nodes[key].type=="root") {
								root=key
								pagefile=tree.nodes[key].link
							}
								
							}
						else if(tree.nodes[key].type=="optional") optionalN++;
						else if(tree.nodes[key].type=="alter") alterN++;
						
						if(storage!=null)
						{
							$.each(storage.nodes[key],function(newattr,value){
							tree.nodes[key][newattr]=value;
							})		
						}
				   })
				   //add children models
				   $.each(childrenModels,function(index,val){
					   tree.nodes[val]={"type":"subroot"}
				   })
				  
				   $.each(data.edges,function(key,val){
					tree.edges[key]={}
					//key:EngineeringProcess  val:{child1:{},child2:{},child3{}}

					if(tree.nodes[key].type=="root"){
						$.each(childrenModels, function(index,val){
							tree.edges[key][val]={"length":2}
						})
					}
					
					 $.each(val,function(childname,edgeAttr){
					  tree.edges[key][childname]=edgeAttr
					  tree.edges[key][childname].length=0.1
					 })
					
				   })
				  // console.log(tree)
				   var count=Object.keys(tree.nodes).length
				   _refreshNumber(count,mandN,optionalN,alterN)
				   sys.merge(tree)
				   sys.renderer.redraw()
				   //printout featurelist
				   var html=_createHtmlforFeatures(root,'')
				  $("#featurelist").html(html)
				  
				})
					.success(function(){ 
						console.log("success");
						dash.loadInitialPageSection()
						$("#models").find("ul h a").each(function(){
							   if(	$(this).html()==modelname){
								   $(this).css("font-weight","bold")
							   }
							   else {
								$(this).css("font-weight","normal")
							   }
							})
						$("#featurelist").find("ul h a").click(function(){
							//alert($(this).html())
							var node=sys.getNode($(this).html())
							sys.renderer.dohighlight(node)
							
						})
					})
					.error(function(){alert("Please check if this model's package and model data exists under the folder "+modelsPackage);console.log("Data loading error");})
					.complete(function(){console.log("complete");});
			},
			
			loadModelList:function(){
			modelsPackage=$('#modelpackage').html()
			var jqxhr =$.getJSON(modelsPackage+"models.json",function(data){
				   //get currentModel data
				var i=0
				$.each(data,function(key,val){
					if(i==0) currentModel=key
					else return false
					i++
				})
				//set pages path
				path=modelsPackage+currentModel+"/"
				var newhtml=_createHtml(data,'')
				$("#models").append(newhtml)
			})
			.success(function(){ 
				console.log("model index success");
				//modify current model value
			//	 currentModel=$("#models").find("ul h a").first().html()
			//	 $("#models").find("ul h a").first().css("font-weight","bold")
				 that.loadFile(currentModel)
				//active the clickable model list
				$("#models").find("ul h a").click(function(){
					//alert($(this).html())
					that.loadFile($(this).html())
				//	$("#models").find("ul h a").css("font-weight","normal")
				//	$(this).css("font-weight","bold")
				}
				)
			})
			.error(function(){console.log("model index Data loading error");})
			.complete(function(){console.log("model index complete");});
			},
	}
    return that
}

//start of the program
  var HalfViz = function(elt){
    var dom = $(elt)
    var parse = Parseur()
    
    var sys = arbor.ParticleSystem({
	"friction":0.2, 
    "stiffness":900,
    "repulsion":400,
    "gravity":false, 
    "fps":60, 
    "dt":0.02, 
    "precision":0.1
	}) //node repulsion, spring tension, fricition
    sys.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...
    sys.screenPadding(20)
    var _nav=dom.find('#nav')
    var _dragger=dom.find('#grabber')
    var _ed = dom.find('#editor')
   
	var _descr=dom.find('.description')
    var _canvas = dom.find('#viewport').get(0)
   
    var _updateTimeout = null

    
    var _current = null // will be the id of the doc if it's been saved before
    var _editing = false // whether to undim the Save menu and prevent navigating away
    var _failures = null
    
    var that = {
      dashboard:Dashboard(sys),
      init:function(){
        $(window).resize(that.resize)
        that.updateLayout()
        that.newDoc()
        _dragger.bind('mousedown', that.grabbed)
        return that
      },
grabbed:function(e){
	 sys.renderer.removeMouseMovementfromCanvas()
	  $(window).bind('mousemove', that.dragged)
      $(window).bind('mouseup', that.released)
      
      return false
},
dragged:function(e){
	var w = dom.width()
	var split=Math.max(10, Math.min(e.pageX-10, w))
    that.updateLayout(split)
    sys.renderer.redraw()
    return false
},
released:function(e){
    $(window).unbind('mousemove', that.dragged)
    sys.renderer.addMouseMovementfromCanvas()
    return false
  },
 newDoc:function(){
	var storage=null
	if(localStorage.nodestate!=undefined)
	{
	   var lorem=localStorage.nodestate
	   storage = parse.parse(lorem)
	   currentModel=localStorage.modelname
	}
	var loadtool=new loadJsonData(storage,sys,that.dashboard)
	sys.renderer.setLoadtool(loadtool)
	loadtool.loadModelList()
	
},
      
 updateLayout:function(split){
     if(split==undefined) split=dom.width()/4
     var canvW = dom.width()-split
     var canvH = dom.height()-8
     var draggerw=5
     var navw=split-draggerw-10
	 //set size for navigation bar 
     _nav.css({"width":navw,"height":canvH,"left":10,"top":10})
     //set the size for dragger
     _dragger.css({"width":draggerw,"height":canvH,"left":10+navw,"top":10})
     //set size for canvas
     dom.find('#viewport').css({"left":split,"top":10})
     //set for counting panel
     dom.find('#modellogo').css({"left":split+10})
     _canvas.width=canvW
     _canvas.height=canvH
     sys.screenSize(canvW, canvH)

        var edw=_ed.width()
		edw=450
		var edh=_ed.height()
		edh=400
		_descr.css({height:edh-60,  width:edw-60})
		_ed.find("h4 a").css({width:(edw-100)/3})
		
		sys.renderer.redraw()
      },

    }
 
    return that.init()    
  }



  $(document).ready(function(){

    var mcp = HalfViz("#halfviz")
   
  })


})(this.jQuery);