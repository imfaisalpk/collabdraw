Ext.define('Whiteboard.Connection', {
    socket : 'undefined',
    whiteboard : 'undefined',
    singlePath : [],
    currentPathLength : 0,
    uid : 'undefined',
    roomName : 'undefined',
    messageEvent : 'undefined',
    page : 1,

    constructor : function(address, whiteboard, room)
    {
        this.whiteboard = whiteboard;
        console.log("Connecting to address " + address);
        this.socket = new WebSocket(address);
        this.roomName = room;
        console.log("Room is " + room);

        spr = this;
        this.socket.onmessage = function(evt){
          message = JXG.decompress(evt.data);
          message = JSON.parse(message);
          evnt = message['event'];
          data = message['data'];
          switch(evnt){
            case 'draw': 
                spr.remoteDraw(spr, data);
                break;
            case 'draw-many':
                spr.remoteDrawMany(spr, data);
                break;
            case 'clear':
                spr.remoteClear(spr, data);
                break;
            case 'ready':
              message = JSON.stringify({"event": "init", "data": {"room": spr.roomName }});
              //console.log("Sending message " + message);
              spr.socket.send(message);
          }
        }
    },
    
    /**
     * Get data from server to initialize this whiteboard
     * @param {Object} uid
     * @param {Object} roomName
     * @param {Object} page
     */
    init : function(uid, roomName, page)
    {
        this.whiteboard.clear(false);
        this.uid = uid;
        this.roomName = roomName;
    },
    
    /**
     * Send a single path (segment) to the server
     * @param {x, y, type, lineColor, lineWidth} a point on the path
     */
    sendPath : function(data)
    {
        this.singlePath.push(data);
        this.currentPathLength++;
        // Send path every two points or when user removes finger
        if (this.currentPathLength > 2 || data.type === "touchend") {
            m = JSON.stringify({"event":"draw-click", "data": {"singlePath": this.singlePath}})
            this.socket.send(m);
            this.singlePath = [];
            this.currentPathLength = 0;
        }
    },

    /**
     * Clear all other canvases (in the same room on the same page)
     */
    sendClear : function()
    {
        m = JSON.stringify({"event":"clear"});
        this.socket.send(m);
    },

    /***
     * All remote functions below
     */

    /**
     * Draw from realtime data incoming from server
     * Called when server sends @event 'draw'
     * @param {Object} self
     * @param {singlePath: [points...]} input
     */
    remoteDraw : function(self, input)
    {
        var sPath = input.singlePath;
        var data = {};
        // point on path
        for (d in sPath) {
            data = sPath[d];
            if (data == null)
                continue;
            if (data.type == 'touchstart')
                self.whiteboard.startPath(data.oldx, data.oldy, data.lineColor, data.lineWidth, false);
            else if (data.type == 'touchmove')
                self.whiteboard.continuePath(data.oldx, data.oldy, data.x, data.y, data.lineColor, data.lineWidth, false);
            else if (data.type == 'touchend')
                self.whiteboard.endPath(data.oldx, data.oldy, data.x, data.y, data.lineColor, data.lineWidth, false);
        }
    },

    /**
     * Draw from stored data incoming from server
     * Called when server sends @event 'draw-many'
     * @param {Object} self
     * @param {datas:[points...]} data
     */
    remoteDrawMany : function(self, data)
    {
        ds = data.datas;
        for (d in ds) {
            if (ds[d] === null)
                continue;
            if (ds[d].type == 'touchstart')
                self.whiteboard.startPath(ds[d].oldx, ds[d].oldy, ds[d].lineColor, ds[d].lineWidth, false);
            else if (ds[d].type == 'touchmove')
                self.whiteboard.continuePath(ds[d].oldx, ds[d].oldy, ds[d].x, ds[d].y, ds[d].lineColor, ds[d].lineWidth, false);
            else if (ds[d].type == 'touchend')
                self.whiteboard.endPath(ds[d].oldx, ds[d].oldy, ds[d].x, ds[d].y, ds[d].lineColor, ds[d].lineWidth, false);
        }
        //self.whiteboard.setTotalPages(data.npages);
    },

    /**
     * Clear from server
     * Called when server sends @event 'clear'
     * @param {Object} self
     * @param {Object} data
     */
    remoteClear : function(self, data)
    {
        self.whiteboard.clear(false);
    },
});