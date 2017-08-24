var vm = new Vue({
    el: '#app',
    data: {
        isDrawerOpen:false,
        rawDatas: null,
        openedGroup:{},
        group: "sarea",
        groupLength:3,
        availableColumns:[]        
    },
    computed: {
        stationDic() {
            return this.makeDict(this.rawDatas);
        },
        groupedStation(){
            return _.groupBy(this.rawDatas, (n) => {return n[this.group].substring(0,this.groupLength);});
        }
    },
    watch: {
        groupLength(){
            this.openedGroup = _.mapValues(this.groupedStation, () => {return false;});            
        },
        group(){
            this.groupLength=_.max(this.rawDatas.map((o)=>{     //get maxLength from new column
                return o[this.group].length;
            }));  

            this.openedGroup = _.mapValues(this.groupedStation, () => {return false;});
        }
    },
    methods: {
        switchDrawer(){
            this.isDrawerOpen=!this.isDrawerOpen;
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

            // 欄位說明請參照:
            // http://data.taipei/opendata/datalist/datasetMeta?oid=8ef1626a-892a-4218-8344-f7ac46e1aa48

            // sno：站點代號、 sna：場站名稱(中文)、 tot：場站總停車格、
            // sbi：場站目前車輛數量、 sarea：場站區域(中文)、 mday：資料更新時間、
            // lat：緯度、 lng：經度、 ar：地(中文)、 sareaen：場站區域(英文)、
            // snaen：場站名稱(英文)、 aren：地址(英文)、 bemp：空位數量、 act：全站禁用狀態

            return axios.get('https://tcgbusfs.blob.core.windows.net/blobyoubike/YouBikeTP.gz')
                .then(res => {

                    var oldData;
                    var oldDict;
                    if (this.rawDatas) {
                        oldData = _.clone(this.rawDatas);
                        oldDict = this.makeDict(oldData);
                    }


                    this.rawDatas = Object.keys(res.data.retVal).map(key => res.data.retVal[key]);


                    var diffStations = _.differenceWith(this.rawDatas, oldData, (a, b)=> {return a.sbi === b.sbi;});

                    stst = this.stationDic; //for test


                    if (oldData && diffStations.length > 0)
                        _.forEach(diffStations, function (v) {
                            console.log(v.sna, v.sbi, oldDict['s' + v.sno].sbi, oldDict['s' + v.sno]);
                            toastr.success(v.sna + '車輛更新', v.sna);
                        });
                });
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
                this.openedGroup = _.mapValues(this.groupedStation, () => {return false;});
            });

        setInterval((e) => {
            this.refreshData();
        }, 5000);

    }
});