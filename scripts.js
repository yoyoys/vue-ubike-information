var vm = new Vue({
    el: '#app',
    data: {
        isDrawerOpen: false,
        rawDatas: null,
        openedGroup: {},
        group: "sarea",
        selectedMarker:null,
        groupLength: 3,
        availableColumns: [{
                value: 'sno',
                name: '站點代號'
            },
            {
                value: 'sna',
                name: '場站名稱(中文)'
            },
            {
                value: 'tot',
                name: '場站總停車格'
            },
            {
                value: 'sbi',
                name: '場站目前車輛數量'
            },
            {
                value: 'sarea',
                name: '場站區域(中文)'
            },
            {
                value: 'mday',
                name: '資料更新時間'
            },
            {
                value: 'lat',
                name: '緯度'
            },
            {
                value: 'lng',
                name: '經度'
            },
            {
                value: 'ar',
                name: '地(中文)'
            },
            {
                value: 'sareaen',
                name: '場站區域(英文)'
            },
            {
                value: 'snaen',
                name: '場站名稱(英文)'
            },
            {
                value: 'aren',
                name: '地址(英文)'
            },
            {
                value: 'bemp',
                name: '空位數量'
            },
            {
                value: 'act',
                name: '全站禁用狀態'
            }
        ],
        googleMap: {
            map: null,
            center: new google.maps.LatLng(25.037, 121.563),
            zoom: 15,
            markers: []
        },
        markers:[],
        markerIcon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            fillColor: 'DarkOrange',
            fillOpacity: 1,
            strokeColor: 'MidnightBlue',
            strokeWeight: 3,
            scale: 3
        },
        markerIconHover: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            fillColor: 'PowderBlue',
            fillOpacity: 1,
            strokeColor: 'MidnightBlue',
            strokeWeight: 3,
            scale: 6
        },
    },
    computed: {
        stationDic() {
            return this.makeDict(this.rawDatas);
        },
        groupedStation() {
            return _.groupBy(this.rawDatas, (n) => {
                return n[this.group].substring(0, this.groupLength);
            });
        }
    },
    watch: {
        groupLength() {
            this.openedGroup = _.mapValues(this.groupedStation, () => {
                return false;
            });
        },
        group() {
            this.groupLength = _.max(this.rawDatas.map((o) => { //get maxLength from new column
                return o[this.group].length;
            }));

            this.openedGroup = _.mapValues(this.groupedStation, () => {
                return false;
            });
        }
    },
    methods: {
        switchDrawer() {
            this.isDrawerOpen = !this.isDrawerOpen;
        },
        makeDict(raw) {
            return raw.reduce(function (map, obj) {
                map['s' + obj.sno] = obj;
                return map;
            }, {});
        },
        totSum(stations) {
            return _.sumBy(stations, (o) => {
                return +o.tot;
            })
        },
        sbiSum(stations) {
            return _.sumBy(stations, (o) => {
                return +o.sbi;
            })
        },
        bempSum(stations) {
            return _.sumBy(stations, (o) => {
                return +o.bemp;
            });
        },
        switchStatus(index) {
            this.openedGroup[index] = !this.openedGroup[index];
        },
        refreshData() {
            return axios.get('https://tcgbusfs.blob.core.windows.net/blobyoubike/YouBikeTP.gz')
                .then(res => {

                    var oldData;
                    var oldDict;
                    if (this.rawDatas) {
                        oldData = _.clone(this.rawDatas);
                        oldDict = this.makeDict(oldData);
                    }


                    this.rawDatas = Object.keys(res.data.retVal).map(key => res.data.retVal[key]);


                    var diffStations = _.differenceWith(this.rawDatas, oldData, (a, b) => {
                        return a.sbi === b.sbi;
                    });

                    stst = this.stationDic; //for test


                    if (oldData && diffStations.length > 0)
                    {
                        _.forEach(diffStations, (v) =>{
                            console.log(v.sna, v.sbi, oldDict['s' + v.sno].sbi, oldDict['s' + v.sno]);
                            this.refreshMarker(v);
                            toastr.success(v.sna + '車輛更新', v.sna);
                        });
                    }
                });
        },
        initMap() {
            this.googleMap.map = new google.maps.Map(document.getElementById('map'), {
                zoom: this.googleMap.zoom,
                center: this.googleMap.center,
            });
        },
        setMarkers() {
            _.forOwn(this.rawDatas, this.setMarker);
        },
        setMarker(rawData) {
            var marker = new google.maps.Marker({
                position: {
                    lat: Number(rawData.lat),
                    lng: Number(rawData.lng)
                },
                animation: google.maps.Animation.DROP,
                icon: this.markerIcon,
                map: this.googleMap.map
            });
            

            this.markers['s'+rawData.sno]=marker;
        },        
        refreshMarker(station) {
            this.markers['s'+station.sno].setMap(null);
            this.setMarker(station);
        },
        navToStation(station){
            if(this.selectedMarker!=null)
                this.selectedMarker.setIcon(this.markerIcon);
            this.selectedMarker = this.markers['s'+station.sno];
            this.selectedMarker.setIcon(this.markerIconHover);

            this.googleMap.map.setCenter({lat:Number(station.lat),lng:Number(station.lng)});
        }
    },
    filters: {
        timeFormat(t) {

            var date = [],
                time = [];

            date.push(t.substr(0, 4));
            date.push(t.substr(4, 2));
            date.push(t.substr(6, 2));
            time.push(t.substr(8, 2));
            time.push(t.substr(10, 2));
            time.push(t.substr(12, 2));

            return date.join("/") + ' ' + time.join(":");
        }
    },
    created() {
        this.refreshData()
            .then(() => {
                this.setMarkers();
                this.openedGroup = _.mapValues(this.groupedStation, () => {
                    return false;
                });
            });

        toastr.options = {
            "closeButton": false,
            "debug": false,
            "newestOnTop": false,
            "progressBar": false,
            "positionClass": "toast-bottom-left",
            "preventDuplicates": false,
            "onclick": null,
            "showDuration": "300",
            "hideDuration": "1000",
            "timeOut": "5000",
            "extendedTimeOut": "1000",
            "showEasing": "swing",
            "hideEasing": "linear",
            "showMethod": "fadeIn",
            "hideMethod": "fadeOut"
        }


        setInterval((e) => {
            this.refreshData();
            //this.refreshMarkers();
        }, 5000);

    },
    mounted() {
        this.initMap();
    }
});