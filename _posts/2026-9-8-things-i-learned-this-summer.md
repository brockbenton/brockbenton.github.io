---
layout: post
title: "Things I Learned This Summer"
date: 2026-09-08 11:00:00 +0000
description: 
categories: [personal-notes]
tags: [lifestyle]
author: Brock Benton
math: true
---

1. *Decomposition.* When you are given a problem, the most effective first step is to decompose the problem into sub-problems. Then, the most effective second step is to find the shortest and quickest path to completion. Most problems individuals face, especially those in technical fields, are large and complex. While it can be initially appealing to tackle the entirety of the problem at first glance, and immediately remind yourself of all the general good practices and principles to invoke while solving the problem, it is better to take a step back and ask yourself these questions: (1) How can this larger, more complex problem be divided into sub-problems, each with a distinct deliverable? (2) For each sub-problem, what is the quickest path towards success, sometimes even if it lacks correct principles and might not be the end goal of the larger problem? (3) Will the sub-problems that I created, along with their proposed solutions, be capable of reconciling with one another to solve the initial problem? After this, problems become much more digestable - and often, the quickest path to success utilizes the good practices and principles that you already know. 

2. *Articulation of Large-Scale, often Technical, Projects.* This can be split into two skills:
    * *Context switching depending on the audience and purpose.* Not all audiences are the same. When you are presenting on a technical project and the audience is non-technical, you must figure out a way to showcase your project without digging into the weeds too much.
    * *Documentation writing in which the non-technical value reconciles with the technical architecture.* Each project should have clearly-defined technical diagrams but sometimes even more importantly, a non-technical section that explains the business value of the project being worked on. 
    
3. *Cuisine as a Cultural-Learning Mechanism.* Partaking in different cultures is an incredible way to meet more people, have a greater sense of the world, and become more appreciative of what people have to offer. One easy way to do this is by eating and experiencing new cuisines. As Anthony Bourdain would say, "Food is everything we are."

4. *A variety of specific technical concepts.* 
    * *Kafka.* An event streaming platform used to publish, store, and process real-time data streams. 
    * *[Railway Oriented Programming](https://fsharpforfunandprofit.com/rop/).* The link describes it much better than I ever would, but the key takeaway: `type Result = Success | ValidationError | Update Error | etc` becomes `type TwoTrack<TEntity> = Success of TEntity | Failure of ErrorMessage` where `type ErrorMessage = NameMustNotBeBlank | EmailMustNotBeBlank`.
    * *Model Context Protocol.* A standard for connecting AI applications (like Claude Code) to external data sources, tools, and workflows. 

5. *Energy is Everything.* If you want to take charge in a room, actually connect with others, or maintain relationships, you must be energetic. Compliment others, say good morning with your chest, and ask questions. 
