import fs from 'node:fs';
const sourceDir = process.argv[2] ?? '.sources';
const read = name => JSON.parse(fs.readFileSync(`${sourceDir}/${name}-source.json`));
const catalog = JSON.parse(fs.readFileSync('public/catalog.json'));
const previousEquipment = new Map((catalog.equipment ?? []).map(item => [item.id, item]));
const groups = { Primary:'primary', Secondary:'secondary', Melee:'melee', Archwing:'archwing', 'Arch-Gun':'archgun', 'Arch-Melee':'archmelee', Pets:'pets', Sentinels:'pets' };
const equipment = Object.entries(groups).flatMap(([file, category]) => read(file).filter(x => x.masterable).map(x => ({...x, collectionCategory:category})));
equipment.push(...read('warframes').filter(x => ['Voidrig','Bonewidow'].includes(x.name)).map(x => ({...x,collectionCategory:'necramech'})));
const items = new Map([...read('Misc'), ...read('Resources'), ...read('Components'), ...equipment].map(x => [x.uniqueName,x]));
const recipes = new Map(read('recipes').ExportRecipes.map(x => [x.resultType,x]));
const market = new Map(JSON.parse(fs.readFileSync(`${sourceDir}/market-items.json`)).data.map(x => [x.gameRef,x.slug]));
const relics = JSON.parse(fs.readFileSync(`${sourceDir}/relics-source.json`)).relics.filter(x=>x.state==='Intact');
function node(item, recipe, count=1, ancestors=new Set(), owner=item) {
  const id = recipe?.uniqueName ?? item.uniqueName;
  if (ancestors.has(id)) throw Error('Recipe cycle: '+id);
  const seen = new Set([...ancestors,id]);
  const name = item.name ?? id.split('/').at(-1);
  const result = {id,name,en:name,count,time:recipe?.buildTime ?? 0,drops:(item.drops??[]).filter(x=>x.location).map(x=>({where:x.location,chance:x.chance})),parts:[],materials:[]};
  result.market = market.get(id);
  const fullName = owner === item || name.startsWith(owner.name) ? name : owner.name + ' ' + name;
  const names = [fullName, fullName+' Blueprint'].map(x=>x.toLowerCase());
  result.relics = relics.flatMap(r=>r.rewards.filter(x=>names.includes(x.itemName.toLowerCase())).map(x=>({name:r.tier+' '+r.relicName,chance:x.chance})));
  result.relics = [...new Map(result.relics.map(x=>[x.name,x])).values()];
  if (item.bpCost) result.drops.unshift({where:'Внутриигровой магазин · '+item.bpCost+' кредитов',en:'In-game Market · '+item.bpCost+' Credits'});
  if (recipe?.buildPrice) result.materials.push({id:'credits',count:recipe.buildPrice});
  for (const ingredient of [...(recipe?.ingredients??[]), ...(recipe?.secretIngredients??[])]) {
    const child = items.get(ingredient.ItemType) ?? {uniqueName:ingredient.ItemType,name:ingredient.ItemType.split('/').at(-1)};
    const sub = recipes.get(child.uniqueName);
    if ((sub && (child.uniqueName.includes('/Mechs/') || child.category === 'Components' || equipment.some(x=>x.uniqueName===child.uniqueName) || /\/Recipes\//.test(child.uniqueName))) || /\/WeaponParts\//.test(child.uniqueName)) result.parts.push(node(child,sub,ingredient.ItemCount,seen,owner));
    else {
      catalog.materials[child.uniqueName] ??= {name:child.name,en:child.name,wiki:child.wikiaUrl,drops:[...new Set((child.drops??[]).map(x=>x.location))].filter(Boolean)};
      result.materials.push({id:child.uniqueName,count:ingredient.ItemCount});
    }
  }
  return result;
}
catalog.frames = catalog.frames.filter(x=>!x.category || x.category === 'warframes').map(x=>({...x,category:'warframes'}));
for (const item of equipment) {
  const recipe = recipes.get(item.uniqueName);
  const root = recipe ? node(item,recipe) : null;
  if(root) { root.name='Основной чертёж'; root.en='Main blueprint'; }
  catalog.frames.push({id:item.uniqueName,name:item.name,nameRu:previousEquipment.get(item.uniqueName)?.nameRu,category:item.collectionCategory,prime:Boolean(item.isPrime),founder:false,image:item.imageName,wiki:item.wikiaUrl??'https://wiki.warframe.com/w/'+encodeURIComponent(item.name.replaceAll(' ','_')),market:market.get(item.uniqueName)?.includes('imprint') ? undefined : market.get(item.uniqueName),release:item.releaseDate,recipe:root});
}
catalog.equipment = catalog.frames.filter(x=>x.category !== 'warframes');
catalog.frames = catalog.frames.filter(x=>x.category === 'warframes');
catalog.equipmentSource = { retrievedAt:new Date().toISOString(), source:'https://github.com/WFCD/warframe-items', recipeManifest:catalog.source.recipeManifest };
fs.writeFileSync('public/catalog.json',JSON.stringify(catalog,null,2)+'\n');
console.log(Object.fromEntries(['warframes',...Object.values(groups),'necramech'].map(c=>[c,[...catalog.frames,...catalog.equipment].filter(x=>x.category===c).length])));
