/**
 * Localization dictionary supporting Russian (ru), English (en), and Chinese (zh).
 */

export type Language = 'ru' | 'en' | 'zh';

export interface Translations {
  gameTitle: string;
  gameSubtitle: string;
  menu: string;
  resumeGame: string;
  restartGame: string;
  selectSuit: string;
  timeOfDay: string;
  controls: string;
  sound: string;
  soundOn: string;
  soundOff: string;
  language: string;
  close: string;
  speed: string;
  altitude: string;
  health: string;
  webFluid: string;
  crimeRadar: string;
  enemies: string;
  spiderSenseAlert: string;
  citySaved: string;
  citySavedDesc: string;
  patrolAgain: string;
  pointerLockTip: string;
  hideControls: string;
  showControls: string;
  // Suits
  suitClassic: string;
  suitClassicDesc: string;
  suitSymbiote: string;
  suitSymbioteDesc: string;
  suitMiles: string;
  suitMilesDesc: string;
  // Times of Day
  timeSunset: string;
  timeSunsetDesc: string;
  timeDay: string;
  timeDayDesc: string;
  timeNight: string;
  timeNightDesc: string;
  // Controls Table
  ctrlMovement: string;
  ctrlMovementDesc: string;
  ctrlJump: string;
  ctrlJumpDesc: string;
  ctrlSwing: string;
  ctrlSwingDesc: string;
  ctrlMelee: string;
  ctrlMeleeDesc: string;
  ctrlWebPellet: string;
  ctrlWebPelletDesc: string;
  ctrlWebCocoon: string;
  ctrlWebCocoonDesc: string;
  ctrlSprint: string;
  ctrlSprintDesc: string;
  ctrlZip: string;
  ctrlZipDesc: string;
  ctrlCamera: string;
  ctrlCameraDesc: string;
  ctrlMenu: string;
  ctrlMenuDesc: string;
  // Statuses
  stateGround: string;
  stateAir: string;
  stateSwing: string;
  stateWall: string;
  stateWallStick: string;
  stateZip: string;
  // Camera Settings
  cameraSettings: string;
  invertX: string;
  invertY: string;
  mouseSensitivity: string;
  cameraSmoothing: string;
  normal: string;
  inverted: string;
  camQuickToggle: string;
}

export const translations: Record<Language, Translations> = {
  ru: {
    gameTitle: 'SPIDER-MAN: WEB-SLINGER 3D',
    gameSubtitle: 'Битва за Манхэттен',
    menu: 'МЕНЮ',
    resumeGame: 'ПРОДОЛЖИТЬ',
    restartGame: 'НАЧАТЬ ЗАНОВО',
    selectSuit: 'ВЫБОР КОСТЮМА',
    timeOfDay: 'АТМОСФЕРА ГОРОДА',
    controls: 'УПРАВЛЕНИЕ',
    sound: 'ЗВУКОВЫЕ ЭФФЕКТЫ',
    soundOn: 'Звук включен',
    soundOff: 'Звук выключен',
    language: 'ЯЗЫК / LANGUAGE',
    close: 'Закрыть (Esc)',
    speed: 'СКОРОСТЬ',
    altitude: 'ВЫСОТА',
    health: 'ЗДОРОВЬЕ',
    webFluid: 'Запас паутины',
    crimeRadar: 'РАДАР',
    enemies: 'Бандиты',
    spiderSenseAlert: 'ПАУЧЬЕ ЧУТЬЕ! НАЖМИТЕ SPACE ДЛЯ УКЛОНЕНИЯ!',
    citySaved: 'РАЙОН В БЕЗОПАСНОСТИ!',
    citySavedDesc: 'Все бандиты в округе обезврежены паутиной. Манхэттен снова спасен!',
    patrolAgain: 'НОВЫЙ ПАТРУЛЬ',
    pointerLockTip: 'Кликните по экрану для захвата мыши (Esc для меню)',
    hideControls: 'Скрыть управление',
    showControls: 'Показать управление',
    suitClassic: 'Классический костюм',
    suitClassicDesc: 'Культовый красно-синий костюм с черной паутиной и эмблемой паука.',
    suitSymbiote: 'Черный симбиот',
    suitSymbioteDesc: 'Глянцевый инопланетный симбиот с органическим блеском и белым пауком.',
    suitMiles: 'Майлз Моралес',
    suitMilesDesc: 'Современный черный тактический костюм с алыми граффити-акцентами.',
    timeSunset: 'Золотой закат',
    timeSunsetDesc: 'Кинематографичный золотой час с теплым солнцем и длинными тенями.',
    timeDay: 'Ясный полдень',
    timeDayDesc: 'Яркое полуденное солнце, лазурное небо и четкие отражения в небоскребах.',
    timeNight: 'Полуночный неон',
    timeNightDesc: 'Ночной киберпанк-мегаполис со светящимися окнами и шпилями.',
    ctrlMovement: 'W, A, S, D',
    ctrlMovementDesc: 'Перемещение Человека-паука в направлении обзора камеры',
    ctrlJump: 'Пробел (Space)',
    ctrlJumpDesc: 'Прыжок / Катапультирование при раскачке на паутине / Отскок от стены',
    ctrlSwing: 'Клавиша E',
    ctrlSwingDesc: 'Выстрел паутиной в здание и раскачка как на маятнике',
    ctrlMelee: 'Левая кнопка мыши (ЛКМ)',
    ctrlMeleeDesc: '4-ударное акробатическое комбо: джеб, кросс, хай-кик с разворота и апперкот',
    ctrlWebPellet: 'Клавиша F',
    ctrlWebPelletDesc: 'Быстрые сгустки паутины с сильным кинетическим ударом',
    ctrlWebCocoon: 'ПКМ (Правая кнопка)',
    ctrlWebCocoonDesc: 'Рывок к зданию (Point-Zip) и прилипание к стене / Сеть-кокон',
    ctrlSprint: 'Клавиша Shift',
    ctrlSprintDesc: 'Супер-спринт по крышам и вертикальный паркур-бег по стенам',
    ctrlZip: 'Клавиша Q',
    ctrlZipDesc: 'Рывок вперед на паутине (Web-Zip)',
    ctrlCamera: 'Клавиша C',
    ctrlCameraDesc: 'Смена режима камеры (динамический / кинематографичный)',
    ctrlMenu: 'Клавиша Esc',
    ctrlMenuDesc: 'Открыть / закрыть меню паузы',
    stateGround: 'ЗЕМЛЯ',
    stateAir: 'В ВОЗДУХЕ',
    stateSwing: 'ПОЛЕТ НА ПАУТИНЕ',
    stateWall: 'БЕГ ПО СТЕНЕ',
    stateWallStick: 'ПРИЛИПАНИЕ К СТЕНЕ',
    stateZip: 'РЫВОК НА ПАУТИНЕ',
    cameraSettings: 'НАСТРОЙКИ КАМЕРЫ',
    invertX: 'Инверсия мыши по горизонтали (X)',
    invertY: 'Инверсия мыши по вертикали (Y)',
    mouseSensitivity: 'Чувствительность обзора',
    cameraSmoothing: 'Плавность камеры (Damping)',
    normal: 'Обычная (Standard)',
    inverted: 'Инвертированная (Inverted)',
    camQuickToggle: 'Инверсия мыши',
  },
  en: {
    gameTitle: 'SPIDER-MAN: WEB-SLINGER 3D',
    gameSubtitle: 'Battle for Manhattan',
    menu: 'MENU',
    resumeGame: 'RESUME',
    restartGame: 'RESTART',
    selectSuit: 'SUIT SELECTION',
    timeOfDay: 'CITY ATMOSPHERE',
    controls: 'CONTROLS',
    sound: 'SOUND EFFECTS',
    soundOn: 'Audio Enabled',
    soundOff: 'Audio Muted',
    language: 'LANGUAGE / ЯЗЫК',
    close: 'Close (Esc)',
    speed: 'SPEED',
    altitude: 'ALTITUDE',
    health: 'HEALTH',
    webFluid: 'Web Fluid',
    crimeRadar: 'RADAR',
    enemies: 'Bandits',
    spiderSenseAlert: 'SPIDER-SENSE TINGLING! PRESS SPACE TO DODGE!',
    citySaved: 'DISTRICT SECURED!',
    citySavedDesc: 'All syndicate thugs in this block have been webbed up. Manhattan is safe once again!',
    patrolAgain: 'PATROL AGAIN',
    pointerLockTip: 'Click screen to lock camera look (Esc for Pause/Menu)',
    hideControls: 'Hide Controls',
    showControls: 'Show Controls',
    suitClassic: 'Classic Suit',
    suitClassicDesc: 'The iconic Red & Blue suit with intricate black webbing and spider insignia.',
    suitSymbiote: 'Black Symbiote',
    suitSymbioteDesc: 'Slick alien symbiote with organic dark sheen and stark white spider emblem.',
    suitMiles: 'Miles Morales',
    suitMilesDesc: 'Modern black tactical suit with vibrant crimson accents and street graffiti vibe.',
    timeSunset: 'Golden Sunset',
    timeSunsetDesc: 'Cinematic golden hour with warm sunlight, long soft shadows, and glowing skies.',
    timeDay: 'Bright Noon',
    timeDayDesc: 'Crisp midday sun with azure skies and sharp architectural reflections.',
    timeNight: 'Midnight Neon',
    timeNightDesc: 'Nocturnal cyberpunk metropolis with glowing windows and illuminated spires.',
    ctrlMovement: 'W, A, S, D',
    ctrlMovementDesc: 'Move Spider-Man relative to the camera direction',
    ctrlJump: 'Spacebar',
    ctrlJumpDesc: 'Jump / Release web swing with catapult boost / Wall jump',
    ctrlSwing: 'E Key',
    ctrlSwingDesc: 'Shoot web to building wall and swing like a pendulum back and forth',
    ctrlMelee: 'Left Mouse Button (LMB)',
    ctrlMeleeDesc: 'Acrobatic 4-hit combo: Jab, Cross, High Roundhouse Kick, and Uppercut',
    ctrlWebPellet: 'F Key',
    ctrlWebPelletDesc: 'Fire rapid-shot Web Pellets with high kinetic impact and stagger',
    ctrlWebCocoon: 'Right Mouse Button (RMB)',
    ctrlWebCocoonDesc: 'Web Cocoon Net: trap and completely immobilize enemies for 5 seconds',
    ctrlSprint: 'Shift Key',
    ctrlSprintDesc: 'Super sprint on ground and vertical parkour run up skyscraper walls',
    ctrlZip: 'Q Key',
    ctrlZipDesc: 'Quick forward Web-Zip burst',
    ctrlCamera: 'C Key',
    ctrlCameraDesc: 'Toggle camera perspective (Dynamic / Cinematic)',
    ctrlMenu: 'Esc Key',
    ctrlMenuDesc: 'Open / Close pause menu',
    stateGround: 'GROUND',
    stateAir: 'AIRBORNE',
    stateSwing: 'SWINGING',
    stateWall: 'WALL RUN',
    stateWallStick: 'WALL CLING',
    stateZip: 'WEB-ZIP',
    cameraSettings: 'CAMERA SETTINGS',
    invertX: 'Invert Horizontal Look (X-Axis)',
    invertY: 'Invert Vertical Look (Y-Axis)',
    mouseSensitivity: 'Look Sensitivity',
    cameraSmoothing: 'Camera Smoothing (Damping)',
    normal: 'Standard',
    inverted: 'Inverted',
    camQuickToggle: 'Mouse Look',
  },
  zh: {
    gameTitle: '蜘蛛侠：蛛丝荡跃 3D',
    gameSubtitle: '曼哈顿守卫战',
    menu: '菜单',
    resumeGame: '继续游戏',
    restartGame: '重新开始',
    selectSuit: '选择战衣',
    timeOfDay: '城市氛围',
    controls: '操作指南',
    sound: '音效设置',
    soundOn: '音效开启',
    soundOff: '音效静音',
    language: '语言 / LANGUAGE',
    close: '关闭 (Esc)',
    speed: '速度',
    altitude: '高度',
    health: '生命值',
    webFluid: '蛛丝容量',
    crimeRadar: '雷达',
    enemies: '犯罪分子',
    spiderSenseAlert: '蜘蛛感应预警！按空格键闪避！',
    citySaved: '街区已净化！',
    citySavedDesc: '所有暴徒均已被蛛网完全制服。曼哈顿再次恢复了安宁！',
    patrolAgain: '再次巡逻',
    pointerLockTip: '点击屏幕锁定视角 (按 Esc 打开菜单)',
    hideControls: '隐藏操作栏',
    showControls: '显示操作栏',
    suitClassic: '经典红蓝战衣',
    suitClassicDesc: '标志性红蓝配色的传奇战衣，附带经典蛛网纹理与胸前蜘蛛标志。',
    suitSymbiote: '共生体战衣',
    suitSymbioteDesc: '液态金属光泽的黑色外星共生体战衣，印有纯白蜘蛛图案。',
    suitMiles: '迈尔斯·莫拉莱斯',
    suitMilesDesc: '科技风黑色碳纤维战衣，搭配醒目鲜红涂鸦与街头美学。',
    timeSunset: '金色黄昏 (Golden Hour)',
    timeSunsetDesc: '夕阳斜照的曼哈顿天际线，温暖柔和的光影与霞光。',
    timeDay: '艳阳高照 (Noon)',
    timeDayDesc: '清澈明媚的午后日光，湛蓝天空与摩天大楼玻璃反光。',
    timeNight: '霓虹午夜 (Neon Night)',
    timeNightDesc: '赛博朋克风格的繁华夜景，璀璨灯火与楼顶航标灯闪烁。',
    ctrlMovement: 'W, A, S, D',
    ctrlMovementDesc: '跟随摄像机视角操控蜘蛛侠移动',
    ctrlJump: '空格键 (Space)',
    ctrlJumpDesc: '跳跃 / 摆荡时弹射加速 / 蹬墙跳',
    ctrlSwing: 'E 键',
    ctrlSwingDesc: '射击蛛丝附着建筑并进行钟摆式大幅荡跃',
    ctrlMelee: '鼠标左键 (LMB)',
    ctrlMeleeDesc: '四段式武术连招：刺拳、直拳、回旋高踢与升龙拳',
    ctrlWebPellet: 'F 键',
    ctrlWebPelletDesc: '发射高速蛛丝弹，击退并硬直敌人',
    ctrlWebCocoon: '鼠标右键 (RMB)',
    ctrlWebCocoonDesc: '蛛网茧陷阱：范围束缚并完全固定敌人 5 秒',
    ctrlSprint: 'Shift 键',
    ctrlSprintDesc: '疾速冲刺跑及摩天大楼垂直飞檐走壁',
    ctrlZip: 'Q 键',
    ctrlZipDesc: '向前快速蛛网突进 (Web-Zip)',
    ctrlCamera: 'C 键',
    ctrlCameraDesc: '切换视角模式 (动态紧随 / 电影远景)',
    ctrlMenu: 'Esc 键',
    ctrlMenuDesc: '打开或关闭暂停菜单',
    stateGround: '地面',
    stateAir: '滞空',
    stateSwing: '荡跃中',
    stateWall: '飞檐走壁',
    stateWallStick: '附墙爬行',
    stateZip: '蛛丝突进',
    cameraSettings: '镜头与鼠标设置',
    invertX: '水平视角反转 (X轴)',
    invertY: '垂直视角反转 (Y轴)',
    mouseSensitivity: '视角灵敏度',
    cameraSmoothing: '镜头阻尼平滑',
    normal: '常规',
    inverted: '反转',
    camQuickToggle: '鼠标视角',
  },
};
