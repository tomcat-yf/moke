

import { Project, Role } from './types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'AI短剧：赛博杭州',
    status: '制作中',
    type: '科幻短片',
    cover: 'https://picsum.photos/seed/cyber/400/250',
    assets: {
      characters: [
        { 
          id: 'c1', 
          name: 'Jack (主角)', 
          img: 'https://picsum.photos/seed/jack/100/100', 
          type: 'character',
          description: 'A gritty cyberpunk detective in his 30s, wearing a worn leather trench coat, glowing neon blue cybernetic eye implant, short messy dark hair, rain-soaked texture.',
          subAssets: [
            { id: 'c1_sub_face', img: 'https://picsum.photos/seed/jack_face/200/200', label: '面部特写', type: 'image' },
            { id: 'c1_sub_side', img: 'https://picsum.photos/seed/jack_side/200/200', label: '侧视图', type: 'image' },
            { id: 'c1_sub_full', img: 'https://picsum.photos/seed/jack_full/200/200', label: '全身像', type: 'image' }
          ]
        },
        { 
          id: 'c2', 
          name: '杀手特工', 
          img: 'https://picsum.photos/seed/killer/100/100', 
          type: 'character',
          description: 'A sleek female assassin, tactical stealth suit with red LED accents, silver bob hair, cold expression, holding a futuristic silenced pistol.',
          subAssets: []
        },
        { 
          id: 'c3', 
          name: '路人甲', 
          img: 'https://picsum.photos/seed/npc/100/100', 
          type: 'character',
          description: 'Cyberpunk street vendor, wearing clear plastic raincoat, mechanical arm serving noodles.',
          subAssets: []
        },
      ],
      scenes: [
        { 
          id: 's1', 
          name: '雨夜小巷', 
          img: 'https://picsum.photos/seed/alley/100/100', 
          type: 'scene',
          description: 'Narrow cyberpunk alleyway, heavy rain, reflecting neon signs in puddles, steam rising from vents, trash cans, holographic advertisements flickering.',
          subAssets: [
             { id: 's1_sub_top', img: 'https://picsum.photos/seed/alley_top/200/200', label: '俯视图', type: 'image' }
          ]
        },
        { 
          id: 's2', 
          name: '赛博实验室', 
          img: 'https://picsum.photos/seed/lab/100/100', 
          type: 'scene',
          description: 'High-tech secret laboratory, cold blue lighting, server racks, glass screens displaying code, sterile white surfaces, cables hanging from ceiling.',
          subAssets: []
        },
      ],
      props: [
        { 
          id: 'pr1', 
          name: '复古终端', 
          img: 'https://picsum.photos/seed/deck/100/100', 
          type: 'prop',
          description: 'A bulky retro-futuristic hacking deck, CRT screen glowing green, mechanical keyboard, stickers on the casing.',
          subAssets: []
        },
      ],
    },
    scripts: [
      {
        id: 'sd_01',
        title: '初版草案 V1.0',
        updatedAt: 1715400000000,
        status: '已归档',
        episodes: [
          {
            id: 'ep_01',
            title: '第一集：觉醒',
            content: 'Jack 在雨夜中醒来...',
            scenes: [],
            status: 'draft'
          }
        ]
      },
      {
        id: 'sd_02',
        title: '定稿剧本 V2.1',
        updatedAt: 1715486400000,
        status: '进行中',
        episodes: [
          {
             id: 'ep_01_final',
             title: '第一集：暗巷突围',
             content: '第1场 雨夜小巷... \n第2场 屋顶追逐...',
             scenes: [
                {
                    id: 'sc_01',
                    title: '第1场：雨夜暗巷',
                    content: '【场景：城郊老宅门口 - 傍晚】（林晚攥着泛黄的遗嘱，指尖泛白。青砖黛瓦的老宅隐在梧桐树荫里，朱红大门斑驳脱落，门环上的铜绿积了厚厚一层。闺蜜苏瑶拎着行李箱，撞了撞她的胳膊）苏瑶：（咋舌）你爷爷真藏着这么个老古董？我查过，这宅子快百年了。（林晚推开门，吱呀一声裂帛般的声响划破寂静。院内杂草没膝，墙角苔藓爬满石缝。正屋八仙桌上，一只缺角的青花瓷碗倒扣着，碗沿沾了点暗红痕迹）林晚：（皱眉）小时候爷爷从不让我来这儿，说有“规矩”。',
                    tasks: [
                      {
                        id: 's1-01',
                        title: '镜头 1: MCU - 林晚阅读遗嘱',
                        status: 'done',
                        script: '林晚攥着泛黄的遗嘱，指尖泛白。',
                        assets: { char: null, scene: null, prop: null },
                        prompt: 'Extreme close-up on a woman\'s hands, tightly clenching a yellowed, brittle will. Her knuckles are white from gripping, and the edges of the will are frayed from being repeatedly touched. The background shows a hint of a sunset-reddened sky.',
                        versions: [
                          { id: 'v1', imgUrl: 'https://picsum.photos/seed/hands_will/800/450', prompt: 'Draft 1', timestamp: 1715400000000, isFavorite: true, type: 'image' }
                        ],
                        keyframeImage: 'https://picsum.photos/seed/hands_will/800/450',
                        breakdown: {
                            subject: '林晚 (Hands only)',
                            mood: 'Tense, Anticipation',
                            composition: 'Extreme Close Up (ECU)',
                            lighting: 'Soft sunset backlighting'
                        },
                        actionDescription: 'Hands trembling slightly, paper crinkling.'
                      },
                      {
                        id: 's1-02',
                        title: '镜头 2: ELS - 老宅全景',
                        status: 'queued',
                        script: '青砖黛瓦的老宅隐在梧桐树荫里，朱红大门斑驳脱落。',
                        assets: { char: null, scene: null, prop: null },
                        prompt: 'Establishing wide shot of an ancient, dilapidated Chinese courtyard house. Grey brick walls, moss-covered stone steps, and a massive peeling vermilion gate. Towering plane trees cast long, eerie shadows in the dim evening light.',
                        versions: [],
                        breakdown: {
                            subject: 'Old Mansion Exterior',
                            mood: 'Eerie, Abandoned, Historical',
                            composition: 'Extreme Long Shot (ELS), Low Angle',
                            lighting: 'Dim evening light, heavy shadows'
                        },
                        actionDescription: 'Camera slowly tilts up from the mossy steps to the roof.'
                      },
                    ],
                  },
             ],
             status: 'analyzed'
          },
          {
             id: 'ep_02_final',
             title: '第二集：赛博核心',
             content: '第1场 实验室...',
             scenes: [],
             status: 'draft'
          }
        ]
      }
    ],
    scenes: [], // Deprecated in favor of episodes
  },
];

export const NAV_CONFIG = {
  production: [
    { 
      label: '项目管理', 
      items: [
        { key: 'dashboard', icon: 'FolderOpen', label: '项目列表' }, 
        { key: 'assets', icon: 'Users', label: '资产中心' }
      ] 
    },
    { 
      label: 'AI 创作中心', 
      items: [
        { key: 'creation_center', icon: 'Sparkles', label: '创作项目' }
      ] 
    },
  ],
  director: [
    { label: '项目管理', items: [{ key: 'dashboard', icon: 'FolderOpen', label: '项目看板' }] },
    { label: '审核中心', items: [{ key: 'creation_center', icon: 'Eye', label: '审阅列表' }] },
  ],
};
