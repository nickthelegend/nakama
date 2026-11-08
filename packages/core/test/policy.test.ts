import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { decodeMemory, encodeMemory, hotSetup, record, suggestedSize, type Hit, type Setup } from '../src/index.js';
const setup:Setup={cadence:1,direction:'down',strikeDistance:-15,move60s:30,move5m:80,hourUtc:12};
const call=(id:string,hit:boolean,other:Partial<Setup>={}):Hit=>({blobId:id,memory:{kind:'call',crewId:'a',callId:id,caller:'0x1',why:'pump',setup:{...setup,...other},hit,joiners:[],createdAt:'2026-11-09T00:00:00Z'}});
const result=(id:string,hit:boolean,size:number):Hit=>({blobId:id,memory:{kind:'result',crewId:'a',callId:id,address:'0x1',size,hit,pnl:hit?size:-size,createdAt:`2026-11-0${id}T00:00:00Z`}});
test('memory encoding and rejection',()=>{assert.deepEqual(decodeMemory(encodeMemory(call('1',true).memory)),call('1',true).memory);assert.equal(decodeMemory('EIDOLON_V1 {}'),null)});
test('hot setup and prefill change with recalled history',()=>{const a=[call('1',true),call('2',true),call('3',false)];assert.equal(hotSetup(a)?.setup.direction,'down');assert.deepEqual(record(a,setup).wins,2);const b=[call('1',false),call('2',false),call('3',false),call('4',true,{direction:'up'}),call('5',true,{direction:'up'})];assert.equal(hotSetup(b)?.setup.direction,'up');assert.equal(record(b,setup).cold,true)});
test('member size responds to history and three win streak',()=>{const low=suggestedSize([result('1',false,2),result('2',false,2)]);const high=suggestedSize([result('1',true,4),result('2',true,4),result('3',true,4)]);assert.ok(high.size>low.size);assert.equal(high.multiplier,1.5);assert.equal(low.multiplier,1)});
